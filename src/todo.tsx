/**
 * Todo page — minimal, Apple-Notes-inspired list with drag-to-reorder and
 * subtask support. Vanilla TS/DOM (no framework).
 *
 * Reliability model (the heavy lifting lives in pure modules under
 * `src/domains/todo/`, which is where the unit tests are):
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

import { loadTasks, saveTasks } from './infra/supabase/persistence';
import { initAuthStore, getAuthState, subscribeAuth } from './domains/auth/store';
import { sanitizeTaskInput, createSafeHtml } from './utils/escapeHtml';
import {
  topLevel,
  childrenOf,
  reindex,
  applyCompletion,
  mergeTasks,
} from './domains/todo/model';
import { SaveController, type SaveStatus } from './domains/todo/save-controller';
import {
  createWal,
  getBrowserStorage,
  walKeyFor,
  type Wal,
  type WalSnapshot,
} from './domains/todo/wal';
import type { Task } from './types';

const LIST_ID = 'tasks-list-todo';
const SYNC_INTERVAL_MS = 30_000;
const FLIP_MS = 220;
const SAVED_FLASH_MS = 1_500;

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

const nowIso = (): string => new Date().toISOString();

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
  ].join('|');
}

function rowInnerHtml(task: Task, tasks: Task[], isSubtask: boolean): string {
  const safeText = createSafeHtml(task.text, { maxLength: 200 });
  const kids = childrenOf(tasks, task.id);
  const hasChildren = kids.length > 0;
  const isCollapsed = collapsedParents.has(task.id);

  const dragHandle = `<span class="todo-row__drag" aria-label="Drag to reorder" title="Drag to reorder">⠿</span>`;

  const toggle = hasChildren
    ? `<button type="button" class="todo-row__toggle" data-task-id="${task.id}" aria-label="${isCollapsed ? 'Expand' : 'Collapse'}" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '▸' : '▾'}</button>`
    : '';

  const addSubBtn = (!isSubtask && !task.completed)
    ? `<button type="button" class="todo-row__add-sub" data-task-id="${task.id}" aria-label="Add subtask" title="Add subtask">+</button>`
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
      data-task-id="${task.id}"
      aria-label="Mark task complete"${checked}
    >
    <label
      class="todo-row__label"
      data-task-id="${task.id}"
      role="button"
      tabindex="0"
      title="Click to edit"
    >${safeText}</label>
    ${badge}
    ${addSubBtn}
    <button
      type="button"
      class="todo-row__delete"
      data-task-id="${task.id}"
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

function renderStatus(status: SaveStatus): void {
  const el = document.getElementById('todo-status');
  if (!el) return;
  el.textContent = STATUS_TEXT[status] ?? '';
  el.dataset.state = status;

  // "Saved" is a brief confirmation flash, then fades back to nothing.
  if (savedFlashTimer) {
    clearTimeout(savedFlashTimer);
    savedFlashTimer = null;
  }
  if (status === 'saved') {
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
  const deletedIds = new Set<string>();
  let loadedSuccessfully = false;

  // Interaction guards — the sync must never run while any of these is active.
  let editingId: string | null = null;
  let subtaskInputActive = false;
  let isDragging = false;
  let signedOut = false;
  let syncPending = false;

  const wal: Wal = createWal(getBrowserStorage(), walKeyFor(userId));

  /* ── save controller ──────────────────────────────────────────── */
  const saveController = new SaveController({
    save: (snapshot: WalSnapshot) =>
      saveTasks(userId, snapshot.tasks, snapshot.deletedIds),
    getSnapshot: (): WalSnapshot => ({
      tasks: tasks.map(t => ({ ...t })),
      deletedIds: [...deletedIds],
    }),
    onPersisted: (snapshot) => {
      // Drop the tombstones we just flushed (re-deletes during the save stay).
      snapshot.deletedIds.forEach(id => deletedIds.delete(id));
    },
    onStatus: (status) => {
      renderStatus(status);
      // Once everything is confirmed saved, the WAL has done its job.
      if (status === 'saved' && !saveController.dirty) wal.clear();
    },
  });

  const refresh = () => {
    // Don't repaint the list out from under an in-progress interaction.
    if (!editingId && !subtaskInputActive && !isDragging) renderList(tasks);
    renderCounter(tasks);
  };

  /** Optimistic: normalise + WAL + render immediately, queue the save. */
  const persist = () => {
    tasks = reindex(tasks);
    wal.write({ tasks, deletedIds: [...deletedIds] });
    refresh();
    saveController.notifyMutation();
  };

  /* ── boot: WAL + server load, merged (never clobbered) ───────────
     A WAL present at boot means the previous session had unsaved work (a
     crash/close/offline). We merge it with whatever the server returns so
     nothing is lost. */
  const walSnap = wal.read();
  if (walSnap) walSnap.deletedIds.forEach(id => deletedIds.add(id));

  let server: Task[] | null = null;
  try {
    server = await loadTasks(userId);
    loadedSuccessfully = true;
  } catch {
    console.error('Initial task load failed — running on the local WAL; saves stay locked until a load succeeds.');
  }

  if (server) {
    tasks = walSnap ? mergeTasks(walSnap.tasks, server, deletedIds) : reindex(server);
    saveController.setLoaded(true);
    // If the WAL carried unsaved work, flush it now that we're unlocked.
    if (walSnap && (walSnap.tasks.length > 0 || walSnap.deletedIds.length > 0)) {
      wal.write({ tasks, deletedIds: [...deletedIds] });
      saveController.notifyMutation();
    }
  } else {
    // Load failed — keep the WAL's optimistic state on screen, saves locked.
    tasks = walSnap ? reindex(walSnap.tasks) : [];
    renderStatus('offline');
  }

  refresh();

  /* ── background sync (merge, never replace) ─────────────────────── */
  const interactionBusy = () => !!editingId || subtaskInputActive || isDragging;

  const runSync = async () => {
    if (signedOut) return;
    if (interactionBusy()) { syncPending = true; return; }
    // In normal operation, never race a pending/failed/in-flight save. While
    // still recovering from a failed initial load we DO sync (the merge is
    // non-destructive) — that's how saves get unlocked again.
    if (loadedSuccessfully &&
        (saveController.dirty || saveController.saveError || saveController.inFlight)) {
      return;
    }

    let fresh: Task[];
    try {
      fresh = await loadTasks(userId);
    } catch {
      return; // offline — keep local state, try again next tick
    }
    // Re-check guards after the await; an interaction may have started.
    if (signedOut || interactionBusy()) { syncPending = true; return; }

    tasks = mergeTasks(tasks, fresh, deletedIds);
    refresh();

    if (!loadedSuccessfully) {
      loadedSuccessfully = true;
      saveController.setLoaded(true); // unlocks + flushes any pending local work
    }
    if (saveController.dirty) {
      wal.write({ tasks, deletedIds: [...deletedIds] });
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

  const submitTask = () => {
    if (!input) return;
    const sanitized = sanitizeTaskInput(input.value.trim());
    if (!sanitized) {
      input.value = '';
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
    persist();
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

  const getTaskId = (el: HTMLElement | null): string | null =>
    el?.dataset.taskId || el?.closest('[data-task-id]')?.getAttribute('data-task-id') || null;

  const findTask = (taskId: string): Task | undefined => tasks.find(t => t.id === taskId);
  const findTaskIdx = (taskId: string): number => tasks.findIndex(t => t.id === taskId);

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

    // Delete
    const deleteBtn = target.closest('.todo-row__delete') as HTMLElement | null;
    if (deleteBtn) {
      const taskId = getTaskId(deleteBtn);
      if (!taskId) return;
      const task = findTask(taskId);
      if (!task) return;
      // Drop the task and any of its children, and tombstone them so the next
      // save deletes exactly these ids on the server (never "delete the rest").
      for (const t of tasks) {
        if (t.id === task.id || t.parent_id === task.id) deletedIds.add(t.id);
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
