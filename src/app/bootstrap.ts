import { getCanonicalTime } from '../core/time';
import { loadTasks as loadTasksFromSupabase } from '../infra/supabase/persistence';
import { getPhilosophicalQuoteInstant } from '../components/reflection';
import { initializeQuantumTimer } from '../components/quantumTimer';
import {
  initializeTaskForms,
  renderTasks,
  attachTaskListeners,
} from '../components/tasks';
import { initializeModalManager } from '../components/modals/modalManager';
import {
  renderModuleIcons,
  renderNavigationIcons,
} from '../utils/iconRenderer';
import { createAppRuntimeStore } from './state';
import { renderDayModule, updateDynamicIcon } from './render';
import { initializeSchedulers } from './scheduler';

function showSyncStatus(message: string, isFinal = false): void {
  const statusEl = document.getElementById('sync-status');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.classList.remove('hidden');
  if (!isFinal) return;

  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 2500);
}

function handleGlobalError(error: Error, context: string): void {
  console.error(`Error in ${context}:`, error);
  showSyncStatus(`⚠️ Error in ${context}. Please refresh the page.`);
  setTimeout(() => {
    const statusEl = document.getElementById('sync-status');
    statusEl?.classList.add('hidden');
  }, 5000);
}

function updateTimeDisplay(): void {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  const el = document.getElementById('current-datetime');
  if (el) el.textContent = new Date().toLocaleString('en-CA', options);
}

export async function bootstrapApp(): Promise<void> {
  const store = createAppRuntimeStore();

  function updateDateDerivedData() {
    const { now } = getCanonicalTime();
    const activeContentDate = new Date(now);
    const todayKey = activeContentDate.toISOString().split('T')[0];
    const todaysQuote = getPhilosophicalQuoteInstant(activeContentDate);
    store.setState({ activeContentDate, todayKey, todaysQuote });
  }

  async function mainRender() {
    updateDateDerivedData();
    const tasks = await loadTasksFromSupabase(store.getState().currentUserId);
    store.setState({ tasks });

    const dayModule = document.getElementById(
      'day-module'
    ) as HTMLElement | null;
    dayModule?.classList.add('active');

    updateDynamicIcon();
    renderNavigationIcons();
    const { todaysQuote } = store.getState();
    renderDayModule(todaysQuote, tasks);
  }

  async function initializeApp() {
    try {
      renderModuleIcons();
      updateDateDerivedData();
      initializeQuantumTimer();

      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        const { activeContentDate, todayKey, tasks, currentUserId } = store.getState();
        initializeModalManager(appContainer, {
          dates: { active: activeContentDate },
          keys: { today: todayKey },
        });
        initializeTaskForms(tasks, currentUserId, mainRender);
        attachTaskListeners('tasks-list-day', currentUserId);
      }

      updateTimeDisplay();
      await mainRender();

      initializeSchedulers({
        updateTime: updateTimeDisplay,
        periodicRender: mainRender,
        syncTasks: async () => {
          const latestTasks = await loadTasksFromSupabase(store.getState().currentUserId);
          store.setState({ tasks: latestTasks });
          renderTasks(latestTasks, 'tasks-list-day');
        },
        onError: handleGlobalError,
      });
    } catch (error) {
      handleGlobalError(error as Error, 'app initialization');
    }
  }

  await initializeApp();
}
