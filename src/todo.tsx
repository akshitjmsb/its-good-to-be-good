/**
 * Todo Page Entry Point
 * Dedicated page for task management with statistics and quick actions
 */

import { loadTasks as loadTasksFromSupabase, saveTasks as saveTasksToSupabase } from './infra/supabase/persistence';
import { renderTasks, attachTaskListeners } from './components/tasks';
import { DEFAULT_USER_ID } from './core/default-user';
import { sanitizeTaskInput } from './utils/escapeHtml';

const LIST_ID = 'tasks-list-todo';

document.addEventListener('DOMContentLoaded', async () => {
    const userId = DEFAULT_USER_ID;
    let tasks = await loadTasksFromSupabase(userId);

    const renderAndWire = (current: { text: string; completed: boolean }[]) => {
        renderTasks(current, LIST_ID);
        attachTaskListeners(LIST_ID, userId);
        updateStatistics(current);
    };

    const persistAndRender = async (current: { text: string; completed: boolean }[]) => {
        await saveTasksToSupabase(userId, current);
        renderAndWire(current);
    };

    renderAndWire(tasks);

    const form = document.getElementById('add-task-form-todo') as HTMLFormElement;
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = form.querySelector('input[type="text"]') as HTMLInputElement;
            const taskText = input?.value.trim();
            if (!taskText) return;

            const sanitizedText = sanitizeTaskInput(taskText);
            if (!sanitizedText) return;

            tasks.push({ text: sanitizedText, completed: false });
            await persistAndRender(tasks);
            input.value = '';
        });
    }

    document.getElementById('clear-completed')?.addEventListener('click', async () => {
        tasks = tasks.filter(t => !t.completed);
        await persistAndRender(tasks);
    });

    document.getElementById('mark-all-complete')?.addEventListener('click', async () => {
        tasks.forEach(t => t.completed = true);
        await persistAndRender(tasks);
    });

    // Periodic sync (every 30 seconds) — refresh from cloud, no save
    setInterval(async () => {
        try {
            tasks = await loadTasksFromSupabase(userId);
            renderAndWire(tasks);
        } catch (error) {
            console.warn('Failed to sync tasks:', error);
        }
    }, 30000);
});

function updateStatistics(tasks: { text: string; completed: boolean }[]) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    const totalEl = document.getElementById('total-tasks');
    const completedEl = document.getElementById('completed-tasks');
    const pendingEl = document.getElementById('pending-tasks');

    if (totalEl) totalEl.textContent = String(total);
    if (completedEl) completedEl.textContent = String(completed);
    if (pendingEl) pendingEl.textContent = String(pending);
}
