import { getCanonicalTime } from '../core/time';
import type { MultilingualQuote } from '../components/reflection';
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
import { initAuthStore, getAuthState } from '../domains/auth/store';
import { onAuthStateChange } from '../domains/auth/session';
import { mountLoginGate } from '../auth/loginGate';
import { mountUserChip } from '../auth/userChip';

// The quote-of-the-day dataset (~150 multilingual quotes) is the single
// largest contributor to the home bundle, yet only one quote shows per day.
// Code-split it: the home shell paints from the static markup + icons, then
// this chunk loads and the quote fills in. Cached after first resolve so the
// periodic re-render doesn't re-fetch it.
let getQuote: ((date: Date) => MultilingualQuote) | null = null;
async function loadQuoteFor(date: Date): Promise<MultilingualQuote> {
  if (!getQuote) {
    ({ getPhilosophicalQuoteInstant: getQuote } = await import(
      '../components/reflection'
    ));
  }
  return getQuote(date);
}

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
  await initAuthStore();
  const authedUser = getAuthState().user;

  if (!authedUser) {
    const host = document.getElementById('app-container');
    if (host) mountLoginGate(host);
    // Once the user signs in, Convex Auth fires SIGNED_IN — reload so the
    // full app boots cleanly with the new session.
    onAuthStateChange((_event, session) => {
      if (session) window.location.reload();
    });
    return;
  }

  // After sign-out, reload to drop module state cleanly and re-mount the gate.
  onAuthStateChange((_event, session) => {
    if (!session) window.location.reload();
  });

  const chipHost = document.getElementById('user-chip');
  if (chipHost) mountUserChip(chipHost);

  const store = createAppRuntimeStore();
  const userId = authedUser.id;
  store.setState({ currentUserId: userId });

  function updateDateDerivedData() {
    const { now } = getCanonicalTime();
    const activeContentDate = new Date(now);
    const todayKey = activeContentDate.toISOString().split('T')[0];
    store.setState({ activeContentDate, todayKey });
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

    // Quote dataset is code-split — the shell + icons above paint without it,
    // then the quote-of-the-day fills in once the chunk resolves.
    const { activeContentDate } = store.getState();
    const todaysQuote = await loadQuoteFor(activeContentDate);
    store.setState({ todaysQuote });
    renderDayModule(todaysQuote);
    setActiveQuote(userId, todaysQuote);
    attachQuoteDeepDive();
  }

  async function initializeApp() {
    try {
      renderModuleIcons();
      // Cache-first: initModuleStore hydrates from localStorage synchronously
      // so we can paint tiles immediately, then refreshes from Convex in the
      // background. When fresh data lands, re-inject tiles and re-render the
      // day module so any remote name/emoji/archive changes appear without
      // a reload. Both callees are idempotent.
      await initModuleStore(userId, {
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
