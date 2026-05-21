/**
 * Todo page — minimal, Apple-Notes-inspired list with drag-to-reorder
 * and subtask support.
 *
 * Drag reorder: touch-friendly drag handle on each row. Long-press or
 * grab the handle to reorder. Position is persisted via a `position`
 * column in Supabase.
 *
 * Subtasks: each task can have children (parent_id). Subtasks render
 * indented beneath their parent with an expand/collapse toggle.
 * Adding a subtask is done via a "+" button that appears on hover/focus.
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

/* ── helpers ─────────────────────────────────────────────────────── */

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

/** Reassign positions sequentially for top-level tasks */
function reindex(tasks: Task[]): void {
  const roots = tasks.filter(t => !t.parent_id).sort((a, b) => a.position - b.position);
  roots.forEach((t, i) => { t.position = i; });

  // Also reindex each parent's children
  const parents = new Set(tasks.filter(t => t.parent_id).map(t => t.parent_id!));
  parents.forEach(pid => {
    const kids = tasks.filter(t => t.parent_id === pid).sort((a, b) => a.position - b.position);
    kids.forEach((t, i) => { t.position = i; });
  });
}


/* ── collapsed state (in-memory, not persisted) ──────────────────── */
const collapsedParents = new Set<string>();

/* ── render ──────────────────────────────────────────────────────── */

function renderRow(task: Task, tasks: Task[], isSubtask = false): string {
  const completedClass = task.completed ? ' completed' : '';
  const subtaskClass = isSubtask ? ' todo-row--subtask' : '';
  const checked = task.completed ? ' checked' : '';
  const safeText = createSafeHtml(task.text, { maxLength: 200 });
  const taskId = task.id || `${task.position}-${task.text.slice(0, 10)}`;

  const kids = task.id ? childrenOf(tasks, task.id) : [];
  const hasChildren = kids.length > 0;
  const isCollapsed = collapsedParents.has(taskId);

  // Drag handle
  const dragHandle = `<span class="todo-row__drag" aria-label="Drag to reorder" title="Drag to reorder">⠿</span>`;

  // Expand/collapse toggle for parents
  const toggle = hasChildren
    ? `<button type="button" class="todo-row__toggle" data-task-id="${taskId}" aria-label="${isCollapsed ? 'Expand' : 'Collapse'}" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '▸' : '▾'}</button>`
    : '';

  // Add subtask button (only for top-level, non-completed tasks)
  const addSubBtn = (!isSubtask && !task.completed)
    ? `<button type="button" class="todo-row__add-sub" data-task-id="${taskId}" aria-label="Add subtask" title="Add subtask">+</button>`
    : '';

  // Subtask count badge
  const badge = (hasChildren && !isSubtask)
    ? `<span class="todo-row__badge">${kids.filter(k => k.completed).length}/${kids.length}</span>`
    : '';

  let html = `
    <div class="todo-row${completedClass}${subtaskClass}" data-task-id="${taskId}" data-is-subtask="${isSubtask}" draggable="false">
      ${dragHandle}
      ${toggle}
      <input
        type="checkbox"
        class="todo-row__checkbox"
        data-task-id="${taskId}"
        aria-label="Mark task complete"${checked}
      >
      <label
        class="todo-row__label"
        data-task-id="${taskId}"
        role="button"
        tabindex="0"
        title="Click to edit"
      >${safeText}</label>
      ${badge}
      ${addSubBtn}
      <button
        type="button"
        class="todo-row__delete"
        data-task-id="${taskId}"
        aria-label="Delete task"
        title="Delete"
      >&times;</button>
    </div>
  `;

  // Render children if expanded
  if (hasChildren && !isCollapsed) {
    html += kids.map(kid => renderRow(kid, tasks, true)).join('');
  }

  return html;
}

function renderList(tasks: Task[]): void {
  const listEl = document.getElementById(LIST_ID);
  if (!listEl) return;

  if (tasks.length === 0) {
    listEl.innerHTML = `<p class="todo-empty">No tasks yet.</p>`;
    return;
  }

  listEl.innerHTML = topLevel(tasks).map(t => renderRow(t, tasks)).join('');
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
  onPersist: () => Promise<void>
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

    // Create placeholder
    placeholder = document.createElement('div');
    placeholder.className = 'todo-row todo-row--placeholder';
    placeholder.style.height = `${rect.height}px`;
    row.parentNode?.insertBefore(placeholder, row);

    // Float the row
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

    // Find which row we're hovering over
    const rows = getRowElements().filter(r => r !== draggedEl);
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) {
        row.parentNode?.insertBefore(placeholder, row);
        return;
      }
    }
    // Past all rows — put placeholder at end
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

    // Determine new order from placeholder position
    placeholder.parentNode?.insertBefore(draggedEl, placeholder);
    placeholder.remove();
    placeholder = null;

    draggedEl.classList.remove('todo-row--dragging');
    draggedEl.style.position = '';
    draggedEl.style.left = '';
    draggedEl.style.width = '';
    draggedEl.style.top = '';
    draggedEl.style.zIndex = '';

    // Read new order from DOM
    const allTasks = getTasks();
    const newOrder = getRowElements().map(r => r.dataset.taskId);
    const roots = allTasks.filter(t => !t.parent_id);
    const reordered: Task[] = [];

    newOrder.forEach((tid, i) => {
      const task = roots.find(t => (t.id || `${t.position}-${t.text.slice(0, 10)}`) === tid);
      if (task) {
        task.position = i;
        reordered.push(task);
      }
    });

    // Keep subtasks as-is
    const subs = allTasks.filter(t => t.parent_id);
    setTasks([...reordered, ...subs]);

    cleanup();
    void onPersist();
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

  // Mouse events
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

  // Touch events
  listEl.addEventListener('touchstart', (e) => {
    const target = e.target as HTMLElement;
    if (!isHandle(target)) return;
    const row = target.closest('.todo-row:not(.todo-row--subtask)') as HTMLElement | null;
    if (!row) return;

    const touch = e.touches[0];
    startY = touch.clientY;

    // Long-press to start drag on touch
    longPressTimer = setTimeout(() => {
      e.preventDefault();
      startDrag(row, touch.clientY);
      // Haptic feedback if available
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
  _tasks: Task[],
  onAdd: (text: string, parentId: string) => Promise<void>
) {
  // Remove any existing subtask input
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

  // Find the right insertion point (after parent + its existing subtasks)
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
  const finish = async (commit: boolean) => {
    if (settled) return;
    settled = true;
    const text = sanitizeTaskInput(input.value.trim());
    inputRow.remove();
    if (commit && text) {
      await onAdd(text, parentTaskId);
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      void finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      void finish(false);
    }
  });

  input.addEventListener('blur', () => void finish(true));
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
    if (editingId === null) {
      renderList(tasks);
    }
    renderCounter(tasks);
  };

  const persist = async () => {
    reindex(tasks);
    refresh();
    try {
      await saveTasksToSupabase(userId, tasks, { loadedSuccessfully });
      // Re-load to get IDs for newly created tasks
      tasks = await loadTasksFromSupabase(userId);
      loadedSuccessfully = true;
      refresh();
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  refresh();

  // Set up drag reorder
  const listEl = document.getElementById(LIST_ID);
  if (listEl) {
    setupDragReorder(
      listEl,
      () => tasks,
      (newTasks) => { tasks = newTasks; refresh(); },
      async () => {
        reindex(tasks);
        try {
          await saveTasksToSupabase(userId, tasks, { loadedSuccessfully });
        } catch (error) {
          console.error('Error saving reorder:', error);
        }
      }
    );
  }

  const form = document.getElementById('add-task-form-todo') as HTMLFormElement | null;
  const input = document.getElementById('todo-input') as HTMLInputElement | null;

  const submitTask = async () => {
    if (!input) return;
    const sanitized = sanitizeTaskInput(input.value.trim());
    if (!sanitized) {
      input.value = '';
      return;
    }
    const maxPos = tasks.filter(t => !t.parent_id).reduce((m, t) => Math.max(m, t.position), -1);
    tasks = [...tasks, { text: sanitized, completed: false, position: maxPos + 1, parent_id: null }];
    input.value = '';
    await persist();
  };

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    await submitTask();
  });

  input?.addEventListener('keydown', async event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    await submitTask();
  });

  const getTaskId = (el: HTMLElement | null): string | null =>
    el?.dataset.taskId || el?.closest('[data-task-id]')?.getAttribute('data-task-id') || null;

  const findTask = (taskId: string): Task | undefined =>
    tasks.find(t => (t.id || `${t.position}-${t.text.slice(0, 10)}`) === taskId);

  const findTaskIdx = (taskId: string): number =>
    tasks.findIndex(t => (t.id || `${t.position}-${t.text.slice(0, 10)}`) === taskId);

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

    const finish = async (commit: boolean) => {
      if (settled) return;
      settled = true;
      const original = tasks[idx]?.text ?? '';
      const sanitized = commit ? sanitizeTaskInput(editInput.value.trim()) : '';
      editingId = null;
      if (commit && sanitized && sanitized !== original) {
        tasks = tasks.map((task, i) =>
          i === idx ? { ...task, text: sanitized } : task
        );
        await persist();
      } else {
        refresh();
      }
    };

    editInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        void finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        void finish(false);
      }
    });

    editInput.addEventListener('blur', () => void finish(true));
  };

  /* ── event delegation ────────────────────────────────────────── */

  listEl?.addEventListener('click', async event => {
    const target = event.target as HTMLElement;

    // Toggle expand/collapse
    const toggleBtn = target.closest('.todo-row__toggle') as HTMLElement | null;
    if (toggleBtn) {
      const taskId = toggleBtn.dataset.taskId;
      if (taskId) {
        if (collapsedParents.has(taskId)) {
          collapsedParents.delete(taskId);
        } else {
          collapsedParents.add(taskId);
        }
        refresh();
      }
      return;
    }

    // Add subtask
    const addSubBtn = target.closest('.todo-row__add-sub') as HTMLElement | null;
    if (addSubBtn && listEl) {
      const parentTaskId = addSubBtn.dataset.taskId;
      if (!parentTaskId) return;

      // Make sure parent is expanded
      collapsedParents.delete(parentTaskId);
      refresh();

      showSubtaskInput(listEl, parentTaskId, tasks, async (text, parentId) => {
        const parentTask = findTask(parentId);
        const parentDbId = parentTask?.id;
        if (!parentDbId) {
          // Can't add subtask without parent having an ID — persist parent first
          await persist();
          const refreshedParent = tasks.find(t =>
            (t.id || `${t.position}-${t.text.slice(0, 10)}`) === parentId
          );
          if (!refreshedParent?.id) return;
        }

        const actualParentId = findTask(parentId)?.id;
        if (!actualParentId) return;

        const siblings = childrenOf(tasks, actualParentId);
        const maxPos = siblings.reduce((m, t) => Math.max(m, t.position), -1);
        tasks.push({
          text,
          completed: false,
          position: maxPos + 1,
          parent_id: actualParentId,
        });
        await persist();
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

      // Also remove children if it's a parent
      if (task.id) {
        tasks = tasks.filter(t => t.parent_id !== task.id);
      }
      tasks = tasks.filter(t => t !== task);
      reindex(tasks);
      await persist();
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

  listEl?.addEventListener('change', async event => {
    const target = event.target as HTMLInputElement;
    if (!target || target.type !== 'checkbox') return;
    const taskId = getTaskId(target);
    if (!taskId) return;
    const idx = findTaskIdx(taskId);
    if (idx === -1) return;

    tasks = tasks.map((task, i) =>
      i === idx ? { ...task, completed: target.checked } : task
    );

    // If completing a parent, also complete all children
    const task = tasks[idx];
    if (task.id && !task.parent_id && target.checked) {
      tasks = tasks.map(t =>
        t.parent_id === task.id ? { ...t, completed: true } : t
      );
    }

    await persist();
  });

  /* ── sync ────────────────────────────────────────────────────── */

  setInterval(async () => {
    if (editingId !== null) return;
    try {
      tasks = await loadTasksFromSupabase(userId);
      refresh();
    } catch (error) {
      console.warn('Failed to sync tasks:', error);
    }
  }, SYNC_INTERVAL_MS);
});
