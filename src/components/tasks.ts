import { Task } from "../types";
import { saveTasks as saveTasksToSupabase, loadTasks as loadTasksFromSupabase } from "../infra/supabase/persistence";
import { sanitizeTaskInput, createSafeHtml } from "../utils/escapeHtml";

export function renderTasks(tasks: Task[], listId: string) {
    const listEl = document.getElementById(listId);
    if(!listEl) return;
    
    if (tasks.length === 0) {
        listEl.innerHTML = '';
        return;
    }
    
    listEl.innerHTML = `
        <div class="tasks-header">
            <span class="tasks-count">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
            <div class="sync-controls">
                <button class="refresh-btn" id="refresh-btn-${listId}" title="Refresh from cloud">🔄</button>
                <span class="sync-indicator" id="sync-indicator-${listId}">🔄</span>
            </div>
        </div>
        ${tasks.map((task, index) => `
            <div class="task-item">
                <input type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''}>
                <label class="${task.completed ? 'completed' : ''}">${createSafeHtml(task.text, { maxLength: 200 })}</label>
                <button class="delete-btn" data-index="${index}" title="Delete task">&times;</button>
            </div>
        `).join('')}
    `;
    
    // Note: Event listeners are attached separately with userId
}

function handleTaskSubmit(e: Event, tasks: Task[], userId: string, mainRender: () => void) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input[type="text"]') as HTMLInputElement;
    if (!input) return;

    const taskText = input.value.trim();
    if (!taskText) return;

    const sanitizedText = sanitizeTaskInput(taskText);

    if (sanitizedText) {
        tasks.push({ text: sanitizedText, completed: false });
        input.value = '';
        saveTasksToSupabase(userId, tasks).then(() => {
            mainRender();
        }).catch(error => {
            console.error('Error saving task:', error);
        });
    } else {
        // Show user feedback for invalid input
        console.warn('Task input was rejected due to security concerns');
        input.value = ''; // Clear the input
    }
}

export function handleTaskDelete(target: HTMLElement, tasks: Task[], userId: string, mainRender: () => void) {
    const index = parseInt(target.dataset.index || '-1');
    if (index > -1) {
        tasks.splice(index, 1);
        saveTasksToSupabase(userId, tasks).then(() => {
            mainRender();
        }).catch(error => {
            console.error('Error deleting task:', error);
        });
    }
}

export function handleTaskToggle(target: HTMLInputElement, tasks: Task[], userId: string, mainRender: () => void) {
    const index = parseInt(target.dataset.index || '-1');
    if (index > -1) {
        tasks[index].completed = !tasks[index].completed;
        saveTasksToSupabase(userId, tasks).then(() => {
            mainRender();
        }).catch(error => {
            console.error('Error toggling task:', error);
        });
    }
}

function attachTaskEventListeners(listId: string, userId: string) {
    const listEl = document.getElementById(listId);
    if (!listEl || listEl.dataset.listenersAttached === 'true') return;
    listEl.dataset.listenersAttached = 'true';

    // Use delegated listeners so handlers survive list rerenders.
    listEl.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;

        const deleteBtn = target.closest('.delete-btn') as HTMLElement | null;
        if (deleteBtn) {
            const index = parseInt(deleteBtn.dataset.index || '-1');
            if (index > -1) {
                // Get tasks from centralized storage
                const tasks = await loadTasksFromSupabase(userId);
                if (tasks[index]) {
                    tasks.splice(index, 1);
                    await saveTasksToSupabase(userId, tasks);
                    // Re-render the tasks
                    renderTasks(tasks, listId);
                }
            }
            return;
        }

        const refreshBtn = target.closest('.refresh-btn');
        if (refreshBtn) {
            void refreshTasksFromCloud(listId, userId);
        }
    });

    // Add change listener for checkboxes
    listEl.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        if (target.type === 'checkbox') {
            const index = parseInt(target.dataset.index || '-1');
            if (index > -1) {
                // Get tasks from centralized storage
                const tasks = await loadTasksFromSupabase(userId);
                if (tasks[index]) {
                    tasks[index].completed = target.checked;
                    await saveTasksToSupabase(userId, tasks);
                    // Re-render the tasks
                    renderTasks(tasks, listId);
                }
            }
        }
    });
}

export function initializeTaskForms(tasks: Task[], userId: string, mainRender: () => void) {
    // Initialize form submission handlers
    document.getElementById('add-task-form-day')?.addEventListener('submit', (e) => handleTaskSubmit(e, tasks, userId, mainRender));
    document.getElementById('add-task-form-night')?.addEventListener('submit', (e) => handleTaskSubmit(e, tasks, userId, mainRender));
}

export function attachTaskListeners(listId: string, userId: string) {
    attachTaskEventListeners(listId, userId);
}

// Function to show sync status
export function showSyncStatus(listId: string, isSyncing: boolean = true) {
    const indicator = document.getElementById(`sync-indicator-${listId}`);
    if (indicator) {
        if (isSyncing) {
            indicator.textContent = '🔄';
            indicator.classList.add('syncing');
        } else {
            indicator.textContent = '✅';
            indicator.classList.remove('syncing');
            // Reset to default after 2 seconds
            setTimeout(() => {
                indicator.textContent = '🔄';
            }, 2000);
        }
    }
}

// Function to refresh tasks from cloud storage
export async function refreshTasksFromCloud(listId: string, userId: string) {
    try {
        showSyncStatus(listId, true);
        const tasks = await loadTasksFromSupabase(userId);
        renderTasks(tasks, listId);
        showSyncStatus(listId, false);
    } catch (error) {
        console.error('Failed to refresh tasks from cloud:', error);
        showSyncStatus(listId, false);
    }
}
