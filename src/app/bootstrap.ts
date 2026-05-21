import { getCanonicalTime } from '../core/time';
import { getPhilosophicalQuoteInstant } from '../components/reflection';
import {
  attachQuoteDeepDive,
  setActiveQuote,
} from '../components/quoteDeepDive';
import { initializeAIProviderSelect } from '../components/aiProviderSelect';
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
import { initializeCustomModules } from './customModules';
import { initializeModuleEditor } from './moduleEditor';
import { createAppRouter } from './moduleRouter';
import { initModuleStore } from '../domains/modules/customModules';

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
    // Re-apply user overrides after the SVG icons paint, so emoji choices
    // for built-in journey tiles aren't wiped by the periodic re-render.
    // initializeCustomModules() guards against duplicate tile injection,
    // so calling it on every render is safe.
    initializeCustomModules();
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
      // Cache-first: initModuleStore hydrates from localStorage synchronously
      // so we can paint tiles immediately, then refreshes from Supabase in the
      // background. When fresh data lands, re-inject tiles and re-render the
      // day module so any remote name/emoji/archive changes appear without
      // a reload. Both callees are idempotent.
      const { currentUserId: bootUserId } = store.getState();
      await initModuleStore(bootUserId, {
        onRefresh: () => {
          initializeCustomModules();
          void mainRender();
        },
      });
      // Inject user-created tiles + apply name/emoji overrides on top of
      // the static icon paint. The editor wiring then attaches the
      // "+ Add module" pill, "Edit" toggle, and per-tile pencils.
      initializeCustomModules();
      initializeModuleEditor();
      // Apple-style drag-to-reorder is disabled — buggy in current form.
      // Carousel/grid order is driven by index.html markup. Re-enable by
      // uncommenting once the long-press/jiggle interaction is fixed.
      // initializeModuleReorder();
      updateDateDerivedData();
      initializeQuantumTimer();
      initializeAIProviderSelect();

      // PWA users on the home screen have no browser refresh button.
      document
        .getElementById('header-refresh-btn')
        ?.addEventListener('click', () => window.location.reload());

      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        const { activeContentDate, todayKey } = store.getState();
        const router = createAppRouter({
          today: () => store.getState().todayKey,
        });
        initializeModalManager(
          appContainer,
          {
            dates: { active: activeContentDate },
            keys: { today: todayKey },
          },
          { router }
        );
        // start() applies the current hash — so a deep link like
        // `index.html#/m/coffee` opens Coffee on cold-start.
        void router.start();
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
