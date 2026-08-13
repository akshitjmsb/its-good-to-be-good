/**
 * Todo page — minimal, Apple-Notes-inspired list with drag-to-reorder and
 * subtask support. Vanilla TS/DOM (no framework).
 *
 * Reliability model (the heavy lifting lives in pure modules under
 * this module folder, which is where the unit tests are):
 *
 *  - Every task carries a client-generated UUID and a client-authoritative
 *    `updated_at`. Saves are an upsert keyed on id plus explicit delete
 *    tombstones — never "delete everything not in my local list".
 *  - All saves funnel through a `SaveController`: one save at a time, dirty is
 *    only cleared on confirmed success, failures retry with backoff and then
 *    fall back to an "offline — saved locally" state without losing data.
 *  - Every mutation is written to a localStorage write-ahead log first, so a
 *    crash/close/offline never loses work; the next boot merges the WAL with
 *    the server.
 *  - The 30s background sync MERGES server state by id (last-writer-wins) and
 *    is skipped while the user is editing, dragging, or typing a subtask, and
 *    while there is unsaved/failed local work — so it can never clobber.
 *  - Auth changes pause saves on sign-out and resume + flush on re-auth.
 *
 * Rendering still reconciles the list by id so DOM identity (focus, hover,
 * CSS transitions) survives, with FLIP animation on reorder.
 */

import { loadTasks, saveTasks } from '../../platform/convex/persistence';
import { initAuthStore, getAuthState, subscribeAuth } from '../../platform/auth/store';
import {
  sanitizeTaskInput,
  createSafeHtml,
  escapeHtmlAttribute,
} from '../../utils/escapeHtml';
import {
  topLevel,
  childrenOf,
  reindex,
  applyCompletion,
  mergeTasks,
  canSync,
} from './model';
import { SaveController, type SaveStatus } from './save-controller';
import {
  createWal,
  findLegacyWalSnapshots,
  getBrowserStorage,
  walKeyFor,
  type Wal,
  type WalSnapshot,
} from './wal';
import {
  isNoteWithinLimit,
  noteHasContent,
  notePlainText,
  plainTextToNoteHtml,
  sanitizeNoteHtml,
} from './rich-text';
import type { Task, TaskDeletion } from '../../types';
import {
  issueJarvisTodoCredential,
  listJarvisTodoCredentials,
  revokeJarvisTodoCredential,
} from '../../platform/convex/jarvis-todo-integration';
import './todo.css';

const LIST_ID = 'tasks-list-todo';
const SYNC_INTERVAL_MS = 30_000;
const FLIP_MS = 220;
const SAVED_FLASH_MS = 1_500;
const NOTE_SAVE_DEBOUNCE_MS = 350;

/* ── helpers ─────────────────────────────────────────────────────── */

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for the rare non-secure context where randomUUID is missing.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * A single page can generate several edits within one millisecond. Keeping
 * revisions strictly monotonic lets the server reject genuinely stale device
 * snapshots without ever mistaking two local edits for the same version.
 */
function createMutationClock() {
  let lastMs = 0;

  return {
    observe(timestamp: string | undefined): void {
      if (!timestamp) return;
      const parsed = Date.parse(timestamp);
      if (!Number.isNaN(parsed)) lastMs = Math.max(lastMs, parsed);
    },
    next(): string {
      lastMs = Math.max(Date.now(), lastMs + 1);
      return new Date(lastMs).toISOString();
    },
  };
}

const mutationClock = createMutationClock();
const nowIso = (): string => mutationClock.next();

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── collapsed state (in-memory, not persisted) ──────────────────── */
const collapsedParents = new Set<string>();

/* ── row rendering ────────────────────────────────────────────────── */

function rowClassName(task: Task, isSubtask: boolean): string {
  return `todo-row${task.completed ? ' completed' : ''}${isSubtask ? ' todo-row--subtask' : ''}`;
}

/**
 * Cheap fingerprint of everything that affects a row's inner markup. When it
 * is unchanged the row's DOM is left untouched on re-render.
 */
function rowSignature(task: Task, tasks: Task[], isSubtask: boolean): string {
  const kids = childrenOf(tasks, task.id);
  const done = kids.filter(k => k.completed).length;
  return [
    task.completed ? '1' : '0',
    isSubtask ? 's' : 't',
    collapsedParents.has(task.id) ? 'c' : 'o',
    kids.length,
    done,
    task.text,
    noteHasContent(task.note) ? 'n' : '-',
  ].join('|');
}

function rowInnerHtml(task: Task, tasks: Task[], isSubtask: boolean): string {
  const safeText = createSafeHtml(task.text, { maxLength: 200 });
  const safeTaskId = escapeHtmlAttribute(task.id);
  const kids = childrenOf(tasks, task.id);
  const hasChildren = kids.length > 0;
  const isCollapsed = collapsedParents.has(task.id);

  const dragHandle = `<span class="todo-row__drag" aria-label="Drag to reorder" title="Drag to reorder">⠿</span>`;

  const toggle = hasChildren
    ? `<button type="button" class="todo-row__toggle" data-task-id="${safeTaskId}" aria-label="${isCollapsed ? 'Expand' : 'Collapse'}" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '▸' : '▾'}</button>`
    : '';

  const addSubBtn = (!isSubtask && !task.completed)
    ? `<button type="button" class="todo-row__add-sub" data-task-id="${safeTaskId}" aria-label="Add subtask" title="Add subtask">+</button>`
    : '';

  const badge = (hasChildren && !isSubtask)
    ? `<span class="todo-row__badge">${kids.filter(k => k.completed).length}/${kids.length}</span>`
    : '';

  const checked = task.completed ? ' checked' : '';

  return `
    ${dragHandle}
    ${toggle}
    <input
      type="checkbox"
      class="todo-row__checkbox"
      data-task-id="${safeTaskId}"
      aria-label="Mark task complete"${checked}
    >
    <label
      class="todo-row__label"
      data-task-id="${safeTaskId}"
      role="button"
      tabindex="0"
      title="Click to edit"
    >${safeText}</label>
    ${badge}
    ${addSubBtn}
    <button
      type="button"
      class="todo-row__note${noteHasContent(task.note) ? ' has-note' : ''}"
      data-task-id="${safeTaskId}"
      aria-label="${noteHasContent(task.note) ? 'Edit note' : 'Add note'}"
      title="${noteHasContent(task.note) ? 'Edit note' : 'Add note'}"
    >Note</button>
    <button
      type="button"
      class="todo-row__delete"
      data-task-id="${safeTaskId}"
      aria-label="Delete task"
      title="Delete"
    >&times;</button>
  `;
}

function createRowEl(task: Task, tasks: Task[], isSubtask: boolean): HTMLElement {
  const el = document.createElement('div');
  el.className = rowClassName(task, isSubtask);
  el.dataset.taskId = task.id;
  el.dataset.isSubtask = String(isSubtask);
  el.setAttribute('draggable', 'false');
  el.innerHTML = rowInnerHtml(task, tasks, isSubtask);
  el.dataset.sig = rowSignature(task, tasks, isSubtask);

  // Fade/slide a freshly created row in. Removed next frame so the CSS
  // transition runs from the entering state to rest.
  el.classList.add('todo-row--enter');
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.remove('todo-row--enter'))
  );
  return el;
}

function updateRow(el: HTMLElement, task: Task, tasks: Task[], isSubtask: boolean): void {
  const cls = rowClassName(task, isSubtask);
  if (el.className !== cls && !el.classList.contains('todo-row--enter')) {
    el.className = cls;
  }
  const sig = rowSignature(task, tasks, isSubtask);
  // Rebuild the inner markup when the signature changed, or when a stray
  // inline-edit input is still mounted (an edit that was cancelled or left
  // the text unchanged, so the signature alone wouldn't trigger a rebuild).
  const hasStrayEdit = !!el.querySelector('.todo-row__edit');
  if (el.dataset.sig !== sig || hasStrayEdit) {
    el.innerHTML = rowInnerHtml(task, tasks, isSubtask);
    el.dataset.sig = sig;
  }
}

/** Flat, ordered list of rows to render: each parent followed by its
 *  expanded children. */
function flatRenderOrder(tasks: Task[]): Array<{ task: Task; isSubtask: boolean }> {
  const out: Array<{ task: Task; isSubtask: boolean }> = [];
  for (const parent of topLevel(tasks)) {
    out.push({ task: parent, isSubtask: false });
    if (!collapsedParents.has(parent.id)) {
      for (const kid of childrenOf(tasks, parent.id)) {
        out.push({ task: kid, isSubtask: true });
      }
    }
  }
  return out;
}

/** FLIP: animate rows from their pre-render position to the new one. */
function flipAnimate(listEl: HTMLElement, prevRects: Map<string, DOMRect>): void {
  listEl.querySelectorAll<HTMLElement>('.todo-row[data-task-id]').forEach(el => {
    const id = el.dataset.taskId;
    if (!id) return;
    const prev = prevRects.get(id);
    if (!prev) return; // newly created — handled by the enter transition
    const next = el.getBoundingClientRect();
    const dy = prev.top - next.top;
    if (Math.abs(dy) < 1) return;

    el.style.transition = 'none';
    el.style.transform = `translateY(${dy}px)`;
    void el.offsetHeight; // force reflow so the transform is the start state
    el.style.transition = `transform ${FLIP_MS}ms ease`;
    el.style.transform = '';

    const clear = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return;
      el.style.transition = '';
      el.style.transform = '';
      el.removeEventListener('transitionend', clear);
    };
    el.addEventListener('transitionend', clear);
  });
}

/**
 * Reconcile the list DOM to match `tasks`, reusing existing row elements by id
 * so DOM identity (and thus focus/transitions) is preserved.
 */
function renderList(tasks: Task[]): void {
  const listEl = document.getElementById(LIST_ID);
  if (!listEl) return;

  const ordered = flatRenderOrder(tasks);

  if (ordered.length === 0) {
    listEl.querySelectorAll('.todo-row[data-task-id]').forEach(el => el.remove());
    if (!listEl.querySelector('.todo-empty')) {
      const p = document.createElement('p');
      p.className = 'todo-empty';
      p.textContent = 'No tasks yet.';
      listEl.appendChild(p);
    }
    return;
  }
  listEl.querySelector('.todo-empty')?.remove();

  const animate = !prefersReducedMotion();
  const prevRects = new Map<string, DOMRect>();
  const existing = new Map<string, HTMLElement>();
  listEl.querySelectorAll<HTMLElement>('.todo-row[data-task-id]').forEach(el => {
    const id = el.dataset.taskId!;
    existing.set(id, el);
    if (animate) prevRects.set(id, el.getBoundingClientRect());
  });

  // Remove rows that no longer exist.
  const desiredIds = new Set(ordered.map(o => o.task.id));
  existing.forEach((el, id) => {
    if (!desiredIds.has(id)) {
      el.remove();
      existing.delete(id);
    }
  });

  // Create/update + place each row in order.
  let prev: HTMLElement | null = null;
  for (const { task, isSubtask } of ordered) {
    const found = existing.get(task.id);
    const el: HTMLElement = found ?? createRowEl(task, tasks, isSubtask);
    if (found) updateRow(el, task, tasks, isSubtask);
    else existing.set(task.id, el);

    const desiredNext: Element | null = prev ? prev.nextElementSibling : listEl.firstElementChild;
    if (el !== desiredNext) {
      if (prev) prev.after(el);
      else listEl.prepend(el);
    }
    prev = el;
  }

  if (animate) flipAnimate(listEl, prevRects);
}

function renderCounter(tasks: Task[]): void {
  const counterEl = document.getElementById('todo-counter');
  if (!counterEl) return;

  const roots = tasks.filter(t => !t.parent_id);
  if (roots.length === 0) {
    counterEl.textContent = '';
    return;
  }

  const done = roots.filter(t => t.completed).length;
  counterEl.textContent = `${done} of ${roots.length} done`;
}

/* ── save-status indicator ───────────────────────────────────────── */

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  retrying: 'Couldn’t save — retrying…',
  offline: 'Offline — changes saved locally',
  'signed-out': 'Signed out — changes saved locally',
};

let savedFlashTimer: ReturnType<typeof setTimeout> | null = null;
let localJournalUnavailable = false;

function renderStatus(status: SaveStatus): void {
  const el = document.getElementById('todo-status');
  if (!el) return;
  const visibleStatus = localJournalUnavailable ? 'local-error' : status;
  el.textContent = localJournalUnavailable
    ? 'Local backup unavailable — wait for Saved before leaving'
    : STATUS_TEXT[status] ?? '';
  el.dataset.state = visibleStatus;

  // "Saved" is a brief confirmation flash, then fades back to nothing.
  if (savedFlashTimer) {
    clearTimeout(savedFlashTimer);
    savedFlashTimer = null;
  }
  if (status === 'saved' && !localJournalUnavailable) {
    savedFlashTimer = setTimeout(() => {
      if (el.dataset.state === 'saved') {
        el.textContent = '';
        el.dataset.state = 'idle';
      }
    }, SAVED_FLASH_MS);
  }
}

/* ── drag-to-reorder (touch + mouse) ────────────────────────────── */

function setupDragReorder(
  listEl: HTMLElement,
  getTasks: () => Task[],
  setTasks: (t: Task[]) => void,
  onPersist: () => void,
  onDragStateChange: (dragging: boolean) => void
) {
  let draggedEl: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;
  let startY = 0;
  let offsetY = 0;
  let isDragging = false;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  const isHandle = (el: HTMLElement | null) =>
    el?.classList.contains('todo-row__drag') || el?.closest('.todo-row__drag');

  function getRowElements(): HTMLElement[] {
    return Array.from(listEl.querySelectorAll('.todo-row:not(.todo-row--subtask)'));
  }

  function startDrag(row: HTMLElement, clientY: number) {
    isDragging = true;
    onDragStateChange(true);
    draggedEl = row;
    const rect = row.getBoundingClientRect();
    offsetY = clientY - rect.top;

    placeholder = document.createElement('div');
    placeholder.className = 'todo-row todo-row--placeholder';
    placeholder.style.height = `${rect.height}px`;
    row.parentNode?.insertBefore(placeholder, row);

    row.classList.add('todo-row--dragging');
    row.style.position = 'fixed';
    row.style.left = `${rect.left}px`;
    row.style.width = `${rect.width}px`;
    row.style.top = `${clientY - offsetY}px`;
    row.style.zIndex = '1000';
  }

  function moveDrag(clientY: number) {
    if (!isDragging || !draggedEl || !placeholder) return;

    draggedEl.style.top = `${clientY - offsetY}px`;

    const rows = getRowElements().filter(r => r !== draggedEl);
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) {
        row.parentNode?.insertBefore(placeholder, row);
        return;
      }
    }
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      lastRow.parentNode?.insertBefore(placeholder, lastRow.nextSibling);
    }
  }

  function endDrag() {
    if (!isDragging || !draggedEl || !placeholder) {
      cleanup();
      return;
    }

    placeholder.parentNode?.insertBefore(draggedEl, placeholder);
    placeholder.remove();
    placeholder = null;

    draggedEl.classList.remove('todo-row--dragging');
    draggedEl.style.position = '';
    draggedEl.style.left = '';
    draggedEl.style.width = '';
    draggedEl.style.top = '';
    draggedEl.style.zIndex = '';

    // Read the new top-level order from the DOM and rewrite positions. Only
    // tasks whose position actually moved get their updated_at bumped.
    const allTasks = getTasks();
    const newOrder = getRowElements().map(r => r.dataset.taskId);
    const roots = allTasks.filter(t => !t.parent_id);
    const ts = nowIso();
    const reordered: Task[] = [];

    newOrder.forEach((tid, i) => {
      const task = roots.find(t => t.id === tid);
      if (task) {
        if (task.position !== i) {
          task.position = i;
          task.updated_at = ts;
        }
        reordered.push(task);
      }
    });

    const subs = allTasks.filter(t => t.parent_id);
    setTasks([...reordered, ...subs]);

    cleanup();
    onPersist();
  }

  function cleanup() {
    const wasDragging = isDragging;
    isDragging = false;
    draggedEl = null;
    if (placeholder) {
      placeholder.remove();
      placeholder = null;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (wasDragging) onDragStateChange(false);
  }

  listEl.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    if (!isHandle(target)) return;
    const row = target.closest('.todo-row:not(.todo-row--subtask)') as HTMLElement | null;
    if (!row) return;
    e.preventDefault();
    startDrag(row, e.clientY);
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      moveDrag(e.clientY);
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) endDrag();
  });

  listEl.addEventListener('touchstart', (e) => {
    const target = e.target as HTMLElement;
    if (!isHandle(target)) return;
    const row = target.closest('.todo-row:not(.todo-row--subtask)') as HTMLElement | null;
    if (!row) return;

    const touch = e.touches[0];
    startY = touch.clientY;

    longPressTimer = setTimeout(() => {
      e.preventDefault();
      startDrag(row, touch.clientY);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 200);
  }, { passive: false });

  listEl.addEventListener('touchmove', (e) => {
    if (longPressTimer && Math.abs(e.touches[0].clientY - startY) > 10) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (isDragging) {
      e.preventDefault();
      moveDrag(e.touches[0].clientY);
    }
  }, { passive: false });

  listEl.addEventListener('touchend', () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (isDragging) endDrag();
  });

  listEl.addEventListener('touchcancel', () => {
    cleanup();
  });
}

/* ── subtask input ───────────────────────────────────────────────── */

function showSubtaskInput(
  listEl: HTMLElement,
  parentTaskId: string,
  onAdd: (text: string, parentId: string) => void,
  onActiveChange: (active: boolean) => void
) {
  listEl.querySelectorAll('.todo-subtask-input-row').forEach(el => el.remove());

  const parentRow = listEl.querySelector(`.todo-row[data-task-id="${parentTaskId}"]`);
  if (!parentRow) return;

  const inputRow = document.createElement('div');
  inputRow.className = 'todo-row todo-row--subtask todo-subtask-input-row';
  inputRow.innerHTML = `
    <span class="todo-row__drag" style="visibility:hidden">⠿</span>
    <input
      type="text"
      class="todo-row__edit todo-subtask-input"
      placeholder="Add subtask..."
      maxlength="200"
      enterkeyhint="done"
      autocapitalize="sentences"
      spellcheck="true"
      aria-label="Add subtask"
    >
  `;

  // Insert after the parent and any existing subtasks.
  let insertAfter: Element = parentRow;
  let next = parentRow.nextElementSibling;
  while (next && next.classList.contains('todo-row--subtask')) {
    insertAfter = next;
    next = next.nextElementSibling;
  }
  insertAfter.parentNode?.insertBefore(inputRow, insertAfter.nextSibling);

  const input = inputRow.querySelector('.todo-subtask-input') as HTMLInputElement;
  // Mark interaction active so the auto-sync / re-render can't yank the input
  // out from under the user while they're typing a subtask.
  onActiveChange(true);
  input.focus();

  let settled = false;
  const finish = (commit: boolean) => {
    if (settled) return;
    settled = true;
    const text = sanitizeTaskInput(input.value.trim());
    inputRow.remove();
    onActiveChange(false);
    if (commit && text) onAdd(text, parentTaskId);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });

  input.addEventListener('blur', () => finish(true));
}

/* ── main ────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthStore();
  const userId = getAuthState().user?.id;
  if (!userId) {
    window.location.href = 'index.html';
    return;
  }

  /* ── shared mutable state ─────────────────────────────────────── */
  let tasks: Task[] = [];
  const deleted = new Map<string, string>();
  let loadedSuccessfully = false;

  // Interaction guards — the sync must never run while any of these is active.
  let editingId: string | null = null;
  let noteEditorId: string | null = null;
  let subtaskInputActive = false;
  let isDragging = false;
  let signedOut = false;
  let syncPending = false;

  const browserStorage = getBrowserStorage();
  const wal: Wal = createWal(browserStorage, walKeyFor(userId));
  const legacyWalSnapshots = findLegacyWalSnapshots(browserStorage, userId);
  let restoredLegacyKeys: string[] = [];
  localJournalUnavailable = browserStorage === null;
  const deletedSnapshot = (): TaskDeletion[] =>
    [...deleted].map(([id, deleted_at]) => ({ id, deleted_at }));
  const writeWal = () => {
    const didWrite = wal.write({ tasks, deleted: deletedSnapshot() });
    if (localJournalUnavailable !== !didWrite) {
      localJournalUnavailable = !didWrite;
      renderStatus(saveController.status);
    }
    return didWrite;
  };

  /* ── save controller ──────────────────────────────────────────── */
  const saveController = new SaveController({
    save: (snapshot: WalSnapshot) =>
      saveTasks(userId, snapshot.tasks, snapshot.deleted),
    getSnapshot: (): WalSnapshot => ({
      tasks: tasks.map(t => ({ ...t })),
      deleted: deletedSnapshot(),
    }),
    onPersisted: (snapshot) => {
      // Drop just the tombstones this confirmed snapshot carried. A second
      // delete of the same id while the request was in flight stays queued.
      snapshot.deleted.forEach(record => {
        if (deleted.get(record.id) === record.deleted_at) deleted.delete(record.id);
      });
      if (restoredLegacyKeys.length && browserStorage) {
        restoredLegacyKeys.forEach(key => browserStorage.removeItem(key));
        restoredLegacyKeys = [];
      }
    },
    onStatus: (status) => {
      renderStatus(status);
      // Once everything is confirmed saved, the WAL has done its job.
      if (status === 'saved' && !saveController.dirty) wal.clear();
    },
  });

  const refresh = () => {
    // Don't repaint the list out from under an in-progress interaction.
    if (!editingId && !noteEditorId && !subtaskInputActive && !isDragging) renderList(tasks);
    renderCounter(tasks);
  };

  /** Optimistic: normalise + WAL + render immediately, queue the save. */
  const persist = (saveDelayMs = 0) => {
    const priorPositions = new Map(tasks.map(task => [task.id, task.position]));
    tasks = reindex(tasks).map(task =>
      priorPositions.get(task.id) !== task.position
        ? { ...task, updated_at: nowIso() }
        : task
    );
    writeWal();
    refresh();
    saveController.notifyMutation(saveDelayMs);
  };

  /* ── boot: WAL + server load, merged (never clobbered) ───────────
     A WAL present at boot means the previous session had unsaved work (a
     crash/close/offline). We merge it with whatever the server returns so
     nothing is lost. */
  const walSnap = wal.read();
  if (walSnap) {
    walSnap.deleted.forEach(record => {
      const previous = deleted.get(record.id);
      if (!previous || Date.parse(record.deleted_at) > Date.parse(previous)) {
        deleted.set(record.id, record.deleted_at);
      }
    });
  }

  let server: Task[] | null = null;
  try {
    server = await loadTasks(userId);
  } catch {
    console.error('Initial task load failed — running on the local WAL; saves stay locked until a load succeeds.');
  }

  if (server) {
    tasks = walSnap ? mergeTasks(walSnap.tasks, server, deleted.keys()) : reindex(server);
    tasks.forEach(task => mutationClock.observe(task.updated_at));
    loadedSuccessfully = true;
    saveController.setLoaded(true);
    // If the WAL carried unsaved work, flush it now that we're unlocked.
    if (walSnap && (walSnap.tasks.length > 0 || walSnap.deleted.length > 0)) {
      writeWal();
      saveController.notifyMutation();
    }
  } else {
    // Load failed — keep the WAL's optimistic state on screen, saves locked.
    tasks = walSnap ? reindex(walSnap.tasks) : [];
    tasks.forEach(task => mutationClock.observe(task.updated_at));
    renderStatus('offline');
  }

  refresh();
  if (localJournalUnavailable) renderStatus(saveController.status);

  /* ── explicit pre-Convex local recovery ───────────────────────── */
  const legacyRecovery = document.getElementById('todo-legacy-recovery');
  const legacyMessage = document.getElementById('todo-legacy-recovery-message');
  const legacyRestore = document.getElementById('todo-legacy-restore');
  const legacyDismiss = document.getElementById('todo-legacy-dismiss');
  const recoverableIds = new Set(
    legacyWalSnapshots.flatMap(candidate => candidate.snapshot.tasks.map(task => task.id))
  );
  if (legacyRecovery && legacyWalSnapshots.length > 0 && recoverableIds.size > 0) {
    legacyRecovery.hidden = false;
    if (legacyMessage) {
      legacyMessage.textContent =
        `Found ${recoverableIds.size} task${recoverableIds.size === 1 ? '' : 's'} ` +
        'saved on this device before the cloud upgrade.';
    }
  }
  legacyRestore?.addEventListener('click', () => {
    for (const candidate of legacyWalSnapshots) {
      candidate.snapshot.deleted.forEach(record => {
        const prior = deleted.get(record.id);
        if (!prior || Date.parse(record.deleted_at) > Date.parse(prior)) {
          deleted.set(record.id, record.deleted_at);
        }
      });
      tasks = mergeTasks(candidate.snapshot.tasks, tasks, deleted.keys(), {
        keepLocalOnly: true,
      });
    }
    restoredLegacyKeys = legacyWalSnapshots.map(candidate => candidate.key);
    tasks.forEach(task => mutationClock.observe(task.updated_at));
    writeWal();
    refresh();
    saveController.notifyMutation();
    if (legacyRecovery) legacyRecovery.hidden = true;
  });
  legacyDismiss?.addEventListener('click', () => {
    if (legacyRecovery) legacyRecovery.hidden = true;
  });

  /* ── background sync (merge, never replace) ─────────────────────── */
  const interactionBusy = () =>
    !!editingId || !!noteEditorId || subtaskInputActive || isDragging;

  const syncGuardsClear = () => {
    if (!loadedSuccessfully) return !interactionBusy() && !signedOut;
    return canSync({
      editingId,
      noteEditorActive: !!noteEditorId,
      subtaskInputActive,
      isDragging,
      saving: saveController.inFlight,
      dirty: saveController.dirty,
      saveError: saveController.saveError,
      signedOut,
    });
  };

  const runSync = async () => {
    if (signedOut) return;
    if (!syncGuardsClear()) {
      if (interactionBusy()) syncPending = true;
      return;
    }

    let fresh: Task[];
    try {
      fresh = await loadTasks(userId);
    } catch {
      return; // offline — keep local state, try again next tick
    }
    // Re-check guards after the await; an interaction may have started.
    if (!syncGuardsClear()) {
      if (interactionBusy()) syncPending = true;
      return;
    }

    const hadLoadedSuccessfully = loadedSuccessfully;
    tasks = mergeTasks(tasks, fresh, deleted.keys(), {
      // During recovery, a local-only row is a WAL-backed offline addition.
      // Once cleanly loaded, a local-only row means another device deleted it
      // and should disappear instead of lingering forever.
      keepLocalOnly: !hadLoadedSuccessfully,
    });
    tasks.forEach(task => mutationClock.observe(task.updated_at));
    refresh();

    if (!loadedSuccessfully) {
      loadedSuccessfully = true;
      saveController.setLoaded(true); // unlocks + flushes any pending local work
    }
    if (saveController.dirty) {
      writeWal();
    }
  };

  /** When an interaction ends, run a sync that was deferred during it. */
  const flushDeferredSync = () => {
    if (syncPending && !interactionBusy() && !signedOut) {
      syncPending = false;
      void runSync();
    }
  };

  setInterval(() => void runSync(), SYNC_INTERVAL_MS);

  // Recover saves the moment connectivity returns.
  window.addEventListener('online', () => {
    saveController.retry();
    void runSync();
  });

  /* ── auth awareness ───────────────────────────────────────────── */
  subscribeAuth((state) => {
    if (state.status === 'anon') {
      signedOut = true;
      saveController.setAuthed(false); // pauses saves; status → signed-out
    } else if (state.status === 'authed') {
      if (state.user?.id && state.user.id !== userId) {
        // Switched accounts — reload to re-init under the new identity.
        window.location.reload();
        return;
      }
      if (signedOut) {
        signedOut = false;
        saveController.setAuthed(true); // resumes + flushes pending work
        void runSync();
      }
    }
  });

  /* ── Jarvis service pairing ───────────────────────────────────── */
  const jarvisConnect = document.getElementById('todo-jarvis-connect') as HTMLButtonElement | null;
  const jarvisCredentials = document.getElementById('todo-jarvis-credentials');
  const jarvisDialog = document.getElementById('todo-jarvis-dialog') as HTMLDialogElement | null;
  const jarvisSecret = document.getElementById('todo-jarvis-secret') as HTMLTextAreaElement | null;
  const jarvisCopy = document.getElementById('todo-jarvis-copy') as HTMLButtonElement | null;
  const jarvisClose = document.getElementById('todo-jarvis-close') as HTMLButtonElement | null;

  const renderJarvisCredentials = async () => {
    if (!jarvisCredentials) return;
    if (jarvisConnect) jarvisConnect.hidden = true;
    try {
      const credentials = await listJarvisTodoCredentials();
      jarvisCredentials.replaceChildren();
      const active = credentials.filter(item => item.revokedAt === null);
      if (jarvisConnect) jarvisConnect.hidden = active.length > 0;
      if (active.length === 0) {
        jarvisCredentials.textContent = 'No active Jarvis connection.';
        return;
      }
      for (const credential of active) {
        const row = document.createElement('div');
        row.className = 'todo-jarvis__credential';
        const description = document.createElement('span');
        const lastUsed = credential.lastUsedAt
          ? `last used ${new Date(credential.lastUsedAt).toLocaleString()}`
          : 'not used yet';
        description.textContent = `${credential.label} · ${lastUsed}`;
        const revoke = document.createElement('button');
        revoke.type = 'button';
        revoke.textContent = 'Revoke';
        revoke.dataset.credentialId = credential.id;
        row.append(description, revoke);
        jarvisCredentials.append(row);
      }
    } catch (error) {
      console.error('Could not load Jarvis credentials:', error);
      jarvisCredentials.textContent = 'Could not load Jarvis connections.';
    }
  };

  jarvisConnect?.addEventListener('click', async () => {
    jarvisConnect.disabled = true;
    try {
      const issued = await issueJarvisTodoCredential();
      if (jarvisSecret) {
        jarvisSecret.value = `JARVIS_TODO_API_URL=${issued.apiUrl}\nJARVIS_TODO_API_TOKEN=${issued.secret}`;
      }
      jarvisDialog?.showModal();
      await renderJarvisCredentials();
    } catch (error) {
      console.error('Could not pair Jarvis:', error);
      if (jarvisCredentials) jarvisCredentials.textContent = 'Pairing failed. Please try again.';
    } finally {
      jarvisConnect.disabled = false;
    }
  });
  jarvisCredentials?.addEventListener('click', async event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-credential-id]');
    if (!button?.dataset.credentialId) return;
    button.disabled = true;
    try {
      await revokeJarvisTodoCredential(button.dataset.credentialId);
      await renderJarvisCredentials();
    } catch (error) {
      console.error('Could not revoke Jarvis credential:', error);
      button.disabled = false;
    }
  });
  jarvisCopy?.addEventListener('click', async () => {
    if (!jarvisSecret?.value) return;
    await navigator.clipboard.writeText(jarvisSecret.value);
    jarvisCopy.textContent = 'Copied';
  });
  jarvisClose?.addEventListener('click', () => {
    jarvisDialog?.close();
  });
  jarvisDialog?.addEventListener('close', () => {
    if (jarvisSecret) jarvisSecret.value = '';
    if (jarvisCopy) jarvisCopy.textContent = 'Copy configuration';
  });
  const refreshJarvisOnResume = () => {
    if (document.visibilityState === 'visible') void renderJarvisCredentials();
  };
  document.addEventListener('visibilitychange', refreshJarvisOnResume);
  window.addEventListener('focus', refreshJarvisOnResume);
  window.addEventListener('pageshow', refreshJarvisOnResume);
  await renderJarvisCredentials();

  /* ── input + mutations ────────────────────────────────────────── */
  const listEl = document.getElementById(LIST_ID);
  if (listEl) {
    setupDragReorder(
      listEl,
      () => tasks,
      (newTasks) => { tasks = newTasks; },
      () => persist(),
      (dragging) => {
        isDragging = dragging;
        if (!dragging) flushDeferredSync();
      }
    );
  }

  const form = document.getElementById('add-task-form-todo') as HTMLFormElement | null;
  const input = document.getElementById('todo-input') as HTMLInputElement | null;
  const addSubmit = document.getElementById('todo-add-submit') as HTMLButtonElement | null;

  const syncAddSubmit = () => {
    if (!input || !addSubmit) return;
    addSubmit.disabled = !sanitizeTaskInput(input.value).length;
  };

  const submitTask = () => {
    if (!input) return;
    const sanitized = sanitizeTaskInput(input.value.trim());
    if (!sanitized) {
      input.value = '';
      syncAddSubmit();
      input.focus();
      return;
    }
    const maxPos = tasks.filter(t => !t.parent_id).reduce((m, t) => Math.max(m, t.position), -1);
    const ts = nowIso();
    tasks = [...tasks, {
      id: makeId(),
      text: sanitized,
      completed: false,
      position: maxPos + 1,
      parent_id: null,
      updated_at: ts,
      created_at: ts,
    }];
    input.value = '';
    syncAddSubmit();
    persist();
    // A tapped Add button normally takes focus for itself. Put it straight
    // back on the line so capture stays as fluid as pressing Return.
    input.focus();
  };

  form?.addEventListener('submit', event => {
    event.preventDefault();
    submitTask();
  });

  input?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    submitTask();
  });

  input?.addEventListener('input', syncAddSubmit);
  syncAddSubmit();

  const getTaskId = (el: HTMLElement | null): string | null =>
    el?.dataset.taskId || el?.closest('[data-task-id]')?.getAttribute('data-task-id') || null;

  const findTask = (taskId: string): Task | undefined => tasks.find(t => t.id === taskId);
  const findTaskIdx = (taskId: string): number => tasks.findIndex(t => t.id === taskId);

  /* ── rich task note ──────────────────────────────────────────── */

  const noteDialog = document.getElementById('todo-note-dialog') as HTMLDialogElement | null;
  const noteTitleInput = document.getElementById('todo-note-title') as HTMLInputElement | null;
  const noteEditor = document.getElementById('todo-note-editor') as HTMLElement | null;
  const noteToolbar = noteDialog?.querySelector('.todo-note-toolbar') as HTMLElement | null;
  const noteMeta = document.getElementById('todo-note-meta');
  const noteClose = document.getElementById('todo-note-close') as HTMLButtonElement | null;
  let noteLastValidHtml = '';
  let noteReturnFocus: HTMLElement | null = null;

  const placeCaretAtEnd = (el: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const renderNoteMeta = (message?: string) => {
    if (!noteMeta) return;
    if (message) {
      noteMeta.textContent = message;
      return;
    }
    const task = noteEditorId ? findTask(noteEditorId) : undefined;
    const characters = notePlainText(task?.note).length;
    noteMeta.textContent = characters
      ? `${characters.toLocaleString()} characters · saved locally first`
      : 'Empty note · saved locally first';
  };

  const saveActiveNote = () => {
    if (!noteEditorId || !noteEditor) return;
    const task = findTask(noteEditorId);
    if (!task) return;

    const sanitized = sanitizeNoteHtml(noteEditor.innerHTML);
    const nextNote = noteHasContent(sanitized) ? sanitized : '';
    if (!isNoteWithinLimit(nextNote)) {
      // Do not truncate. Restore the last durable draft so an oversized paste
      // cannot erase the user's note, then explain exactly what happened.
      noteEditor.innerHTML = noteLastValidHtml;
      placeCaretAtEnd(noteEditor);
      renderNoteMeta('Note limit reached — your previous draft is still safe.');
      return;
    }

    noteLastValidHtml = nextNote;
    if ((task.note ?? '') === nextNote) {
      renderNoteMeta();
      return;
    }

    tasks = tasks.map(item =>
      item.id === task.id
        ? { ...item, note: nextNote, updated_at: nowIso() }
        : item
    );
    persist(NOTE_SAVE_DEBOUNCE_MS); // WAL before the save controller ever sees this edit.
    renderNoteMeta();
  };

  const saveActiveNoteTitle = () => {
    if (!noteEditorId || !noteTitleInput) return;
    const task = findTask(noteEditorId);
    if (!task) return;
    const text = sanitizeTaskInput(noteTitleInput.value);
    if (!text) {
      renderNoteMeta('A task needs a title; the existing title is safe.');
      return;
    }
    if (text === task.text) return;
    tasks = tasks.map(item =>
      item.id === task.id
        ? { ...item, text, updated_at: nowIso() }
        : item
    );
    persist(NOTE_SAVE_DEBOUNCE_MS);
  };

  const finishNoteEditor = () => {
    if (!noteEditorId) return;
    saveActiveNote();
    if (noteTitleInput && !sanitizeTaskInput(noteTitleInput.value)) {
      const task = findTask(noteEditorId);
      if (task) noteTitleInput.value = task.text;
    }
    saveActiveNoteTitle();
    saveController.flushNow();
    noteEditorId = null;
    noteLastValidHtml = '';
    if (noteDialog?.open) noteDialog.close();
    refresh();
    flushDeferredSync();
    noteReturnFocus?.focus();
    noteReturnFocus = null;
  };

  const openNoteEditor = (taskId: string, opener?: HTMLElement) => {
    if (!noteDialog || !noteTitleInput || !noteEditor || editingId) return;
    const task = findTask(taskId);
    if (!task) return;

    noteEditorId = task.id;
    noteReturnFocus = opener ?? (document.activeElement as HTMLElement | null);
    noteLastValidHtml = sanitizeNoteHtml(task.note);
    noteTitleInput.value = task.text;
    noteEditor.innerHTML = noteLastValidHtml;
    renderNoteMeta();

    try {
      if (!noteDialog.open) noteDialog.showModal();
    } catch {
      // Current Safari supports <dialog>; this small fallback keeps the paper
      // sheet usable in an older installed PWA instead of losing the editor.
      noteDialog.setAttribute('open', '');
    }

    requestAnimationFrame(() => {
      noteEditor.focus();
      placeCaretAtEnd(noteEditor);
    });
  };

  const insertSanitizedNoteHtml = (html: string) => {
    if (!noteEditor) return;
    const safe = sanitizeNoteHtml(html);
    if (!safe) return;
    noteEditor.focus();
    if (document.execCommand('insertHTML', false, safe)) return;

    const selection = window.getSelection();
    if (!selection?.rangeCount) {
      noteEditor.insertAdjacentHTML('beforeend', safe);
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = range.createContextualFragment(safe);
    const last = fragment.lastChild;
    range.insertNode(fragment);
    if (last) {
      range.setStartAfter(last);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const executeNoteCommand = (command: string) => {
    if (!noteEditor) return;
    noteEditor.focus();
    switch (command) {
      case 'bold':
        document.execCommand('bold');
        break;
      case 'italic':
        document.execCommand('italic');
        break;
      case 'underline':
        document.execCommand('underline');
        break;
      case 'heading':
        document.execCommand('formatBlock', false, 'h2');
        break;
      case 'unordered-list':
        document.execCommand('insertUnorderedList');
        break;
      case 'ordered-list':
        document.execCommand('insertOrderedList');
        break;
      case 'quote':
        document.execCommand('formatBlock', false, 'blockquote');
        break;
      case 'clear':
        document.execCommand('removeFormat');
        document.execCommand('formatBlock', false, 'p');
        break;
      default:
        return;
    }
    saveActiveNote();
  };

  noteClose?.addEventListener('click', finishNoteEditor);
  noteDialog?.addEventListener('cancel', event => {
    event.preventDefault();
    finishNoteEditor();
  });
  noteDialog?.addEventListener('close', () => {
    // Escape/native close bypasses the Done button; finalise the already-WAL'd
    // draft before allowing the list to paint again.
    if (noteEditorId) finishNoteEditor();
  });
  noteTitleInput?.addEventListener('input', saveActiveNoteTitle);
  noteTitleInput?.addEventListener('blur', () => {
    if (!noteTitleInput || sanitizeTaskInput(noteTitleInput.value)) return;
    const task = noteEditorId ? findTask(noteEditorId) : undefined;
    if (task) noteTitleInput.value = task.text;
    renderNoteMeta();
  });
  noteEditor?.addEventListener('input', saveActiveNote);
  noteEditor?.addEventListener('paste', event => {
    event.preventDefault();
    const richHtml = event.clipboardData?.getData('text/html') ?? '';
    const plainText = event.clipboardData?.getData('text/plain') ?? '';
    const html = richHtml ? sanitizeNoteHtml(richHtml) : plainTextToNoteHtml(plainText);
    insertSanitizedNoteHtml(html);
    saveActiveNote();
  });
  noteEditor?.addEventListener('drop', event => {
    event.preventDefault();
    insertSanitizedNoteHtml(plainTextToNoteHtml(event.dataTransfer?.getData('text/plain') ?? ''));
    saveActiveNote();
  });
  noteEditor?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finishNoteEditor();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveActiveNote();
      renderNoteMeta('Saved locally first.');
    }
  });
  noteToolbar?.addEventListener('mousedown', event => event.preventDefault());
  noteToolbar?.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-note-command]');
    const command = button?.dataset.noteCommand;
    if (command) executeNoteCommand(command);
  });

  /* ── inline edit ─────────────────────────────────────────────── */

  const beginEdit = (taskId: string) => {
    if (editingId !== null) return;
    const idx = findTaskIdx(taskId);
    if (idx === -1) return;

    const row = listEl?.querySelector(`.todo-row[data-task-id="${taskId}"]`) as HTMLElement | null;
    const label = row?.querySelector('.todo-row__label') as HTMLElement | null;
    if (!row || !label) return;

    editingId = taskId;

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-row__edit';
    editInput.value = tasks[idx].text;
    editInput.maxLength = 200;
    editInput.setAttribute('aria-label', 'Edit task');
    editInput.setAttribute('enterkeyhint', 'done');
    editInput.autocapitalize = 'sentences';
    editInput.spellcheck = true;
    label.replaceWith(editInput);
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);

    let settled = false;

    const finish = (commit: boolean) => {
      if (settled) return;
      settled = true;
      const editIdx = findTaskIdx(taskId);
      const original = editIdx === -1 ? '' : tasks[editIdx].text;
      const sanitized = commit ? sanitizeTaskInput(editInput.value.trim()) : '';
      editingId = null;
      if (commit && sanitized && sanitized !== original && editIdx !== -1) {
        const ts = nowIso();
        tasks = tasks.map((task, i) =>
          i === editIdx ? { ...task, text: sanitized, updated_at: ts } : task
        );
        persist();
      } else {
        // Restore the label (updateRow rebuilds the row with the stray edit input gone).
        refresh();
      }
      flushDeferredSync();
    };

    editInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });

    editInput.addEventListener('blur', () => finish(true));
  };

  /* ── event delegation ────────────────────────────────────────── */

  listEl?.addEventListener('click', event => {
    const target = event.target as HTMLElement;

    // Toggle expand/collapse
    const toggleBtn = target.closest('.todo-row__toggle') as HTMLElement | null;
    if (toggleBtn) {
      const taskId = toggleBtn.dataset.taskId;
      if (taskId) {
        if (collapsedParents.has(taskId)) collapsedParents.delete(taskId);
        else collapsedParents.add(taskId);
        refresh();
      }
      return;
    }

    // Add subtask
    const addSubBtn = target.closest('.todo-row__add-sub') as HTMLElement | null;
    if (addSubBtn && listEl) {
      const parentTaskId = addSubBtn.dataset.taskId;
      if (!parentTaskId) return;

      collapsedParents.delete(parentTaskId);
      refresh();

      showSubtaskInput(
        listEl,
        parentTaskId,
        (text, parentId) => {
          const parent = findTask(parentId);
          if (!parent) return;
          const siblings = childrenOf(tasks, parent.id);
          const maxPos = siblings.reduce((m, t) => Math.max(m, t.position), -1);
          const ts = nowIso();
          tasks = [...tasks, {
            id: makeId(),
            text,
            completed: false,
            position: maxPos + 1,
            parent_id: parent.id,
            updated_at: ts,
            created_at: ts,
          }];
          persist();
        },
        (active) => {
          subtaskInputActive = active;
          if (!active) flushDeferredSync();
        }
      );
      return;
    }

    // Focused note sheet
    const noteBtn = target.closest('.todo-row__note') as HTMLElement | null;
    if (noteBtn) {
      const taskId = getTaskId(noteBtn);
      if (taskId) openNoteEditor(taskId, noteBtn);
      return;
    }

    // Delete
    const deleteBtn = target.closest('.todo-row__delete') as HTMLElement | null;
    if (deleteBtn) {
      const taskId = getTaskId(deleteBtn);
      if (!taskId) return;
      const task = findTask(taskId);
      if (!task) return;
      // Drop the task and any of its children, and tombstone them so the next
      // save deletes exactly these ids on the server (never "delete the rest").
      const deletedAt = nowIso();
      for (const t of tasks) {
        if (t.id === task.id || t.parent_id === task.id) deleted.set(t.id, deletedAt);
      }
      tasks = tasks.filter(t => t.id !== task.id && t.parent_id !== task.id);
      persist();
      return;
    }

    // Edit label
    const label = target.closest('.todo-row__label') as HTMLElement | null;
    if (label) {
      const taskId = getTaskId(label);
      if (taskId) beginEdit(taskId);
    }
  });

  listEl?.addEventListener('keydown', event => {
    const target = event.target as HTMLElement;
    const label = target.closest('.todo-row__label') as HTMLElement | null;
    if (!label) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const taskId = getTaskId(label);
    if (taskId) beginEdit(taskId);
  });

  listEl?.addEventListener('change', event => {
    const target = event.target as HTMLInputElement;
    if (!target || target.type !== 'checkbox') return;
    const taskId = getTaskId(target);
    if (!taskId) return;
    if (findTaskIdx(taskId) === -1) return;
    // Bidirectional parent/child completion cascade lives in the pure model.
    tasks = applyCompletion(tasks, taskId, target.checked, nowIso());
    persist();
  });
});
