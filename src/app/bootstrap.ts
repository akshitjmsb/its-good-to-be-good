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
import { createAppRuntimeState } from './state';
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
  const state = createAppRuntimeState();

  async function updateDateDerivedData() {
    const { now } = getCanonicalTime();
    state.activeContentDate = new Date(now);
    state.todayKey = state.activeContentDate.toISOString().split('T')[0];
    state.todaysQuote = getPhilosophicalQuoteInstant(state.activeContentDate);

    if (!ai) return;
    showQuoteLoadingIndicator();

    generateAIPhilosophicalQuote(state.activeContentDate)
      .then(aiQuote => {
        hideQuoteLoadingIndicator();
        if (!aiQuote || aiQuote.quote === state.todaysQuote?.quote) return;

        state.todaysQuote = aiQuote;
        const lifePointerEl = document.getElementById(
          'life-pointer-display-day'
        );
        if (lifePointerEl) {
          lifePointerEl.innerHTML = renderQuoteHTML(aiQuote);
        }
      })
      .catch(error => {
        hideQuoteLoadingIndicator();
        console.log(
          'Background AI quote generation failed, using curated quote:',
          error
        );
      });
  }

  async function mainRender() {
    await updateDateDerivedData();
    state.tasks = await loadTasksFromSupabase(state.currentUserId);

    const dayModule = document.getElementById(
      'day-module'
    ) as HTMLElement | null;
    dayModule?.classList.add('active');

    updateDynamicIcon();
    renderNavigationIcons();
    renderDayModule(state.todaysQuote, state.tasks);
  }

  async function initializeApp() {
    try {
      renderModuleIcons();
      await updateDateDerivedData();
      initializeQuantumTimer();

      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        initializeModalManager(appContainer, {
          dates: { active: state.activeContentDate },
          keys: { today: state.todayKey },
        });
        initializeTaskForms(state.tasks, state.currentUserId, mainRender);
        attachTaskListeners('tasks-list-day', state.currentUserId);
      }

      updateTimeDisplay();
      await mainRender();

      initializeSchedulers({
        updateTime: updateTimeDisplay,
        periodicRender: mainRender,
        syncTasks: async () => {
          const latestTasks = await loadTasksFromSupabase(state.currentUserId);
          state.tasks = latestTasks;
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
