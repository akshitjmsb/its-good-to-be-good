/**
 * Todo page — minimal, Apple-Notes-inspired list.
 *
 * Owns its own row renderer (the homepage no longer touches tasks, so the
 * shared components/tasks.ts is gone). Completed rows sink to the bottom
 * and pick up a line-through + muted treatment. Periodic 30 s pull keeps
 * the list in sync with Supabase across devices.
 */

import {
  loadTasks as loadTasksFromSupabase,
  saveTasks as saveTasksToSupabase,
} from './infra/supabase/persistence';
import { DEFAULT_USER_ID } from './core/default-user';
import { sanitizeTaskInput, createSafeHtml } from './utils/escapeHtml';
import type { Task } from './types';

const LIST_ID = 'tasks-list-todo';
const SYNC_INTERVAL_MS = 30_000;

interface DisplayTask extends Task {
  originalIndex: number;
}

function decorate(tasks: Task[]): DisplayTask[] {
  return tasks
    .map((task, originalIndex) => ({ ...task, originalIndex }))
    .sort((a, b) => {
      if (a.completed === b.completed) return a.originalIndex - b.originalIndex;
      return a.completed ? 1 : -1;
    });
}

function renderRow(task: DisplayTask): string {
  const completedClass = task.completed ? ' completed' : '';
  const checked = task.completed ? ' checked' : '';
  const safeText = createSafeHtml(task.text, { maxLength: 200 });
  return `
    <div class="todo-row${completedClass}" role="listitem" data-index="${task.originalIndex}">
      <input
        type="checkbox"
        class="todo-row__checkbox"
        data-index="${task.originalIndex}"
        aria-label="Mark task complete"${checked}
      >
      <label
        class="todo-row__label"
        data-index="${task.originalIndex}"
        role="button"
        tabindex="0"
        title="Click to edit"
      >${safeText}</label>
      <button
        type="button"
        class="todo-row__delete"
        data-index="${task.originalIndex}"
        aria-label="Delete task"
        title="Delete"
      >&times;</button>
    </div>
  `;
}

function renderList(tasks: Task[]): void {
  const listEl = document.getElementById(LIST_ID);
  if (!listEl) return;

  if (tasks.length === 0) {
    listEl.innerHTML = `<p class="todo-empty">No tasks yet.</p>`;
    return;
  }

  listEl.innerHTML = decorate(tasks).map(renderRow).join('');
}

function renderCounter(tasks: Task[]): void {
  const counterEl = document.getElementById('todo-counter');
  if (!counterEl) return;

  if (tasks.length === 0) {
    counterEl.textContent = '';
    return;
  }

  const done = tasks.filter(t => t.completed).length;
  counterEl.textContent = `${done} of ${tasks.length} done`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const userId = DEFAULT_USER_ID;
  let tasks: Task[] = await loadTasksFromSupabase(userId);
  let editingIndex: number | null = null;

  const refresh = () => {
    if (editingIndex === null) {
      renderList(tasks);
    }
    renderCounter(tasks);
  };

  const persist = async () => {
    refresh();
    try {
      await saveTasksToSupabase(userId, tasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  refresh();

  const form = document.getElementById('add-task-form-todo') as HTMLFormElement | null;
  const input = document.getElementById('todo-input') as HTMLInputElement | null;

  const submitTask = async () => {
    if (!input) return;
    const sanitized = sanitizeTaskInput(input.value.trim());
    if (!sanitized) {
      input.value = '';
      return;
    }
    tasks = [...tasks, { text: sanitized, completed: false }];
    input.value = '';
    await persist();
  };

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    await submitTask();
  });

  // Belt-and-braces: some mobile browsers (notably older iOS Safari) don't
  // always fire implicit form submission for single-field forms even with a
  // submit button. Catch Enter on the input directly so Return on the
  // mobile keyboard always works.
  input?.addEventListener('keydown', async event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    await submitTask();
  });

  const listEl = document.getElementById(LIST_ID);

  const beginEdit = (index: number) => {
    if (editingIndex !== null) return;
    if (Number.isNaN(index) || index < 0 || index >= tasks.length) return;
    const row = listEl?.querySelector(
      `.todo-row[data-index="${index}"]`
    ) as HTMLElement | null;
    const label = row?.querySelector('.todo-row__label') as HTMLElement | null;
    if (!row || !label) return;

    editingIndex = index;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-row__edit';
    input.value = tasks[index].text;
    input.maxLength = 200;
    input.setAttribute('aria-label', 'Edit task');
    input.setAttribute('enterkeyhint', 'done');
    input.autocapitalize = 'sentences';
    input.spellcheck = true;
    label.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    let settled = false;

    const finish = async (commit: boolean) => {
      if (settled) return;
      settled = true;
      const original = tasks[index]?.text ?? '';
      const sanitized = commit ? sanitizeTaskInput(input.value.trim()) : '';
      editingIndex = null;
      if (commit && sanitized && sanitized !== original) {
        tasks = tasks.map((task, i) =>
          i === index ? { ...task, text: sanitized } : task
        );
        await persist();
      } else {
        refresh();
      }
    };

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        void finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        void finish(false);
      }
    });

    input.addEventListener('blur', () => {
      void finish(true);
    });
  };

  listEl?.addEventListener('click', async event => {
    const target = event.target as HTMLElement | null;

    const deleteBtn = target?.closest('.todo-row__delete') as HTMLElement | null;
    if (deleteBtn) {
      const index = Number(deleteBtn.dataset.index ?? -1);
      if (Number.isNaN(index) || index < 0 || index >= tasks.length) return;
      tasks = tasks.filter((_, i) => i !== index);
      await persist();
      return;
    }

    const label = target?.closest('.todo-row__label') as HTMLElement | null;
    if (label) {
      const index = Number(label.dataset.index ?? -1);
      beginEdit(index);
    }
  });

  listEl?.addEventListener('keydown', event => {
    const target = event.target as HTMLElement | null;
    const label = target?.closest('.todo-row__label') as HTMLElement | null;
    if (!label) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const index = Number(label.dataset.index ?? -1);
    beginEdit(index);
  });

  listEl?.addEventListener('change', async event => {
    const target = event.target as HTMLInputElement | null;
    if (!target || target.type !== 'checkbox') return;
    const index = Number(target.dataset.index ?? -1);
    if (Number.isNaN(index) || index < 0 || index >= tasks.length) return;
    tasks = tasks.map((task, i) =>
      i === index ? { ...task, completed: target.checked } : task
    );
    await persist();
  });

  setInterval(async () => {
    if (editingIndex !== null) return;
    try {
      tasks = await loadTasksFromSupabase(userId);
      refresh();
    } catch (error) {
      console.warn('Failed to sync tasks:', error);
    }
  }, SYNC_INTERVAL_MS);
});
