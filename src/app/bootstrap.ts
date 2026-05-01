import { ai } from '../infra/ai';
import { getCanonicalTime } from '../core/time';
import { loadTasks as loadTasksFromSupabase } from '../infra/supabase/persistence';
import {
  generateAIPhilosophicalQuote,
  getPhilosophicalQuoteInstant,
  hideQuoteLoadingIndicator,
  showQuoteLoadingIndicator,
} from '../components/reflection';
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
import { renderDayModule, renderQuoteHTML, updateDynamicIcon } from './render';
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

  async function updateDateDerivedData() {
    const { now } = getCanonicalTime();
    const activeContentDate = new Date(now);
    const todayKey = activeContentDate.toISOString().split('T')[0];
    const todaysQuote = getPhilosophicalQuoteInstant(activeContentDate);
    store.setState({ activeContentDate, todayKey, todaysQuote });

    if (!ai) return;
    showQuoteLoadingIndicator();

    generateAIPhilosophicalQuote(activeContentDate)
      .then(aiQuote => {
        hideQuoteLoadingIndicator();
        const current = store.getState().todaysQuote;
        if (!aiQuote || aiQuote.quote === current?.quote) return;
        store.setState({ todaysQuote: aiQuote });
      })
      .catch(error => {
        hideQuoteLoadingIndicator();
        console.log(
          'Background AI quote generation failed, using curated quote:',
          error
        );
      });
  }

  // Re-render the life-pointer when the quote changes (e.g. async AI quote arrives).
  let lastRenderedQuote = store.getState().todaysQuote;
  store.subscribe(state => {
    if (state.todaysQuote === lastRenderedQuote) return;
    lastRenderedQuote = state.todaysQuote;
    if (!state.todaysQuote) return;
    const lifePointerEl = document.getElementById('life-pointer-display-day');
    if (lifePointerEl) {
      lifePointerEl.innerHTML = renderQuoteHTML(state.todaysQuote);
    }
  });

  async function mainRender() {
    await updateDateDerivedData();
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
      await updateDateDerivedData();
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
