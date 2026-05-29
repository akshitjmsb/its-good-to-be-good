/**
 * Todo page — minimal, Apple-Notes-inspired list with drag-to-reorder
 * and subtask support.
 *
 * Persistence is deterministic: every task gets a stable client-generated
 * UUID the moment it is created, so saves are a plain upsert + delete-stale
 * (see infra/supabase/persistence.ts) with no insert-then-reload guessing.
 * All saves funnel through a single serialized queue so rapid edits never
 * race each other or clobber one another's optimistic state.
 *
 * Rendering reconciles the list by id rather than rebuilding it: rows keep
 * their DOM identity across changes, so focus, hover and CSS transitions
 * survive, and reorders (e.g. a completed task sinking to the bottom)
 * animate with a FLIP transition instead of teleporting.
 */

import {
  loadTasks as loadTasksFromSupabase,
  saveTasks as saveTasksToSupabase,
} from './infra/supabase/persistence';
import { initAuthStore, getAuthState } from './domains/auth/store';
import { sanitizeTaskInput, createSafeHtml } from './utils/escapeHtml';
import type { Task } from './types';

const LIST_ID = 'tasks-list-todo';
const SYNC_INTERVAL_MS = 30_000;
const FLIP_MS = 220;

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

/** Get top-level tasks sorted by position, completed sinking to bottom */
function topLevel(tasks: Task[]): Task[] {
  return tasks
    .filter(t => !t.parent_id)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.position - b.position;
    });
}

/** Get subtasks for a given parent, sorted by position */
function childrenOf(tasks: Task[], parentId: string | undefined): Task[] {
  if (!parentId) return [];
  return tasks
    .filter(t => t.parent_id === parentId)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.position - b.position;
    });
}

/** Reassign positions sequentially for top-level tasks and each parent's kids */
function reindex(tasks: Task[]): void {
  const roots = tasks.filter(t => !t.parent_id).sort((a, b) => a.position - b.position);
  roots.forEach((t, i) => { t.position = i; });

  const parents = new Set(tasks.filter(t => t.parent_id).map(t => t.parent_id!));
  parents.forEach(pid => {
    const kids = tasks.filter(t => t.parent_id === pid).sort((a, b) => a.position - b.position);
    kids.forEach((t, i) => { t.position = i; });
  });
}

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
 * Cheap fingerprint of everything that affects a row's inner markup. When
 * it is unchanged the row's DOM is left untouched on re-render.
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
 * Reconcile the list DOM to match `tasks`, reusing existing row elements by
 * id so DOM identity (and thus focus/transitions) is preserved.
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

/* ── drag-to-reorder (touch + mouse) ────────────────────────────── */

function setupDragReorder(
  listEl: HTMLElement,
  getTasks: () => Task[],
  setTasks: (t: Task[]) => void,
  onPersist: () => void
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

    // Read the new top-level order from the DOM and rewrite positions.
    const allTasks = getTasks();
    const newOrder = getRowElements().map(r => r.dataset.taskId);
    const roots = allTasks.filter(t => !t.parent_id);
    const reordered: Task[] = [];

    newOrder.forEach((tid, i) => {
      const task = roots.find(t => t.id === tid);
      if (task) {
        task.position = i;
        reordered.push(task);
      }
    });

    const subs = allTasks.filter(t => t.parent_id);
    setTasks([...reordered, ...subs]);

    cleanup();
    onPersist();
  }

  function cleanup() {
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
  onAdd: (text: string, parentId: string) => void
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
  input.focus();

  let settled = false;
  const finish = (commit: boolean) => {
    if (settled) return;
    settled = true;
    const text = sanitizeTaskInput(input.value.trim());
    inputRow.remove();
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

  let loadedSuccessfully = false;
  let tasks: Task[] = [];
  try {
    tasks = await loadTasksFromSupabase(userId);
    loadedSuccessfully = true;
  } catch {
    console.error('Initial task load failed — saves are blocked until a successful load.');
  }
  reindex(tasks);

  let editingId: string | null = null;

  const refresh = () => {
    if (editingId === null) renderList(tasks);
    renderCounter(tasks);
  };

  /* ── serialized save queue ───────────────────────────────────────
     Only one save runs at a time. Mutations that land while a save is
     in flight set `dirty`, and the queue loops to flush the latest state
     once. This makes overlapping edits converge instead of racing, and
     removes the old save→reload→re-render round-trip that clobbered
     optimistic updates. */
  let saving = false;
  let dirty = false;

  const flushSave = async () => {
    // Never diff against a server we failed to read — that would let
    // delete-stale wipe real rows. Saves unlock once a load succeeds.
    if (!loadedSuccessfully) return;
    if (saving) { dirty = true; return; }
    saving = true;
    try {
      do {
        dirty = false;
        await saveTasksToSupabase(userId, tasks, { loadedSuccessfully: true });
      } while (dirty);
    } catch (error) {
      console.error('Error saving tasks:', error);
    } finally {
      saving = false;
    }
  };

  const scheduleSave = () => { void flushSave(); };

  // Optimistic, immediate render + a queued background save.
  const persist = () => {
    reindex(tasks);
    refresh();
    scheduleSave();
  };

  refresh();

  const listEl = document.getElementById(LIST_ID);
  if (listEl) {
    setupDragReorder(
      listEl,
      () => tasks,
      (newTasks) => { tasks = newTasks; },
      () => persist()
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
    tasks = [...tasks, { id: makeId(), text: sanitized, completed: false, position: maxPos + 1, parent_id: null }];
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
        tasks = tasks.map((task, i) =>
          i === editIdx ? { ...task, text: sanitized } : task
        );
        persist();
      } else {
        // Restore the label (updateRow rebuilds the row with the stray edit input gone).
        refresh();
      }
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

      showSubtaskInput(listEl, parentTaskId, (text, parentId) => {
        const parent = findTask(parentId);
        if (!parent) return;
        const siblings = childrenOf(tasks, parent.id);
        const maxPos = siblings.reduce((m, t) => Math.max(m, t.position), -1);
        tasks = [...tasks, {
          id: makeId(),
          text,
          completed: false,
          position: maxPos + 1,
          parent_id: parent.id,
        }];
        persist();
      });
      return;
    }

    // Delete
    const deleteBtn = target.closest('.todo-row__delete') as HTMLElement | null;
    if (deleteBtn) {
      const taskId = getTaskId(deleteBtn);
      if (!taskId) return;
      const task = findTask(taskId);
      if (!task) return;
      // Drop the task and any of its children.
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
    const idx = findTaskIdx(taskId);
    if (idx === -1) return;

    const checked = target.checked;
    tasks = tasks.map((task, i) =>
      i === idx ? { ...task, completed: checked } : task
    );

    // Completing a parent cascades to its children.
    const task = tasks[idx];
    if (!task.parent_id && checked) {
      tasks = tasks.map(t =>
        t.parent_id === task.id ? { ...t, completed: true } : t
      );
    }

    persist();
  });

  /* ── periodic sync ───────────────────────────────────────────────
     Pull server state on an interval, but never while the user is
     editing or while a local save is pending/in-flight — otherwise a
     stale read would clobber unsaved work. */
  setInterval(async () => {
    if (editingId !== null || saving || dirty) return;
    let fresh: Task[];
    try {
      fresh = await loadTasksFromSupabase(userId);
    } catch (error) {
      console.warn('Failed to sync tasks:', error);
      return;
    }
    if (editingId !== null || saving || dirty) return; // re-check after the await
    tasks = fresh;
    loadedSuccessfully = true;
    reindex(tasks);
    refresh();
  }, SYNC_INTERVAL_MS);
});
