import { getCanonicalTime } from '../core/time';
import { getPhilosophicalQuoteInstant } from '../components/reflection';
import {
  attachQuoteDeepDive,
  setActiveQuote,
} from '../components/quoteDeepDive';
import { initializeQuantumTimer } from '../components/quantumTimer';
import { initializeModalManager } from '../components/modals/modalManager';
import {
  renderModuleIcons,
  renderNavigationIcons,
} from '../utils/iconRenderer';
import { createAppRuntimeStore } from './state';
import { renderDayModule } from './render';
import { initializeSchedulers } from './scheduler';
// Disabled: Apple-style drag-to-reorder. Keep the module on disk; just don't wire it up.
// import { initializeModuleReorder } from './moduleReorder';

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

    const dayModule = document.getElementById(
      'day-module'
    ) as HTMLElement | null;
    dayModule?.classList.add('active');

    renderNavigationIcons();
    const { todaysQuote, currentUserId } = store.getState();
    renderDayModule(todaysQuote);
    if (todaysQuote) {
      setActiveQuote(currentUserId, todaysQuote);
      attachQuoteDeepDive();
    }
  }

  async function initializeApp() {
    try {
      renderModuleIcons();
      // Apple-style drag-to-reorder is disabled — buggy in current form.
      // Carousel/grid order is driven by index.html markup. Re-enable by
      // uncommenting once the long-press/jiggle interaction is fixed.
      // initializeModuleReorder();
      updateDateDerivedData();
      initializeQuantumTimer();

      // PWA users on the home screen have no browser refresh button.
      document
        .getElementById('header-refresh-btn')
        ?.addEventListener('click', () => window.location.reload());

      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        const { activeContentDate, todayKey } = store.getState();
        initializeModalManager(appContainer, {
          dates: { active: activeContentDate },
          keys: { today: todayKey },
        });
      }

      updateTimeDisplay();
      await mainRender();

      initializeSchedulers({
        updateTime: updateTimeDisplay,
        periodicRender: mainRender,
        onError: handleGlobalError,
      });
    } catch (error) {
      handleGlobalError(error as Error, 'app initialization');
    }
  }

  await initializeApp();
}
