/**
 * Single source of truth for the Quantum focus timer.
 *
 * Both the home-page widget (top-right corner) and the dedicated
 * quantum.html page subscribe to this module, so they always reflect
 * the same state and survive cross-tab navigation. Persistence is
 * localStorage only — the active session is pinned by `endsAt` (an
 * absolute Date.now() value), and the `storage` event keeps multiple
 * tabs in sync.
 *
 * Pure logic — no DOM access here so it tests in node.
 */

import { createStore, type Store } from './store';

export type QuantumStatus = 'idle' | 'running' | 'break';

export interface QuantumSession {
  /** Local-time ISO string, e.g. "2026-05-01T16:42:00.000Z". */
  completedAt: string;
  /** Session length in milliseconds. */
  durationMs: number;
}

export interface QuantumState {
  status: QuantumStatus;
  /** Absolute end time in ms-since-epoch when status === 'running'. */
  endsAt: number | null;
  /** Remaining ms in the current session. Updated on each tick. */
  remainingMs: number;
  /** Configured session length. */
  durationMs: number;
  /** Most recent completed sessions, newest first, capped to MAX_HISTORY. */
  history: QuantumSession[];
}

export const DEFAULT_DURATION_MS = 30 * 60 * 1000;
const MAX_HISTORY = 20;
const ACTIVE_KEY = 'quantum-timer:active';
const HISTORY_KEY = 'quantum-timer:history';

interface PersistedActive {
  endsAt: number;
  durationMs: number;
}

type Now = () => number;
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

function safeGetItem(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(storage: Storage | null, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    /* quota / privacy mode — silently degrade to in-memory */
  }
}

function safeRemoveItem(storage: Storage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* see above */
  }
}

function loadActive(storage: Storage | null, now: Now): PersistedActive | null {
  const raw = safeGetItem(storage, ACTIVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedActive>;
    if (
      typeof parsed.endsAt !== 'number' ||
      typeof parsed.durationMs !== 'number' ||
      parsed.endsAt <= now()
    ) {
      return null;
    }
    return { endsAt: parsed.endsAt, durationMs: parsed.durationMs };
  } catch {
    return null;
  }
}

function loadHistory(storage: Storage | null): QuantumSession[] {
  const raw = safeGetItem(storage, HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is QuantumSession =>
          !!s &&
          typeof s.completedAt === 'string' &&
          typeof s.durationMs === 'number'
      )
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export interface QuantumTimerOptions {
  storage?: Storage | null;
  now?: Now;
  durationMs?: number;
}

export interface QuantumTimer {
  store: Store<QuantumState>;
  start: () => void;
  /** Stop without recording a completion. Resets to idle. */
  cancel: () => void;
  /** Acknowledge / dismiss the break and return to idle. */
  skipBreak: () => void;
  /** Recompute remaining time from `Date.now()`. Drives the visible tick. */
  refresh: () => void;
  /** Detach storage listener (for tests). */
  destroy: () => void;
}

export function createQuantumTimer(
  options: QuantumTimerOptions = {}
): QuantumTimer {
  const now: Now = options.now ?? (() => Date.now());
  const storage: Storage | null =
    options.storage !== undefined
      ? options.storage
      : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;
  const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;

  const persistedActive = loadActive(storage, now);
  // If the persisted active row exists but has expired (or is unparseable),
  // scrub it so storage doesn't accumulate stale entries across sessions.
  if (!persistedActive && safeGetItem(storage, ACTIVE_KEY) !== null) {
    safeRemoveItem(storage, ACTIVE_KEY);
  }
  const history = loadHistory(storage);

  const initial: QuantumState = persistedActive
    ? {
        status: 'running',
        endsAt: persistedActive.endsAt,
        remainingMs: Math.max(0, persistedActive.endsAt - now()),
        durationMs: persistedActive.durationMs,
        history,
      }
    : {
        status: 'idle',
        endsAt: null,
        remainingMs: durationMs,
        durationMs,
        history,
      };

  const store = createStore<QuantumState>(initial);

  function persistActive(state: QuantumState): void {
    if (state.status === 'running' && state.endsAt !== null) {
      safeSetItem(
        storage,
        ACTIVE_KEY,
        JSON.stringify({ endsAt: state.endsAt, durationMs: state.durationMs })
      );
    } else {
      safeRemoveItem(storage, ACTIVE_KEY);
    }
  }

  function persistHistory(history: QuantumSession[]): void {
    if (history.length === 0) {
      safeRemoveItem(storage, HISTORY_KEY);
    } else {
      safeSetItem(storage, HISTORY_KEY, JSON.stringify(history));
    }
  }

  function start(): void {
    const state = store.getState();
    if (state.status === 'running') return;
    const endsAt = now() + state.durationMs;
    const next: QuantumState = {
      ...state,
      status: 'running',
      endsAt,
      remainingMs: state.durationMs,
    };
    store.setState(next);
    persistActive(next);
  }

  function cancel(): void {
    const state = store.getState();
    if (state.status === 'idle') return;
    const next: QuantumState = {
      ...state,
      status: 'idle',
      endsAt: null,
      remainingMs: state.durationMs,
    };
    store.setState(next);
    persistActive(next);
  }

  function skipBreak(): void {
    const state = store.getState();
    if (state.status !== 'break') return;
    const next: QuantumState = {
      ...state,
      status: 'idle',
      endsAt: null,
      remainingMs: state.durationMs,
    };
    store.setState(next);
  }

  function complete(): void {
    const state = store.getState();
    const session: QuantumSession = {
      completedAt: new Date(now()).toISOString(),
      durationMs: state.durationMs,
    };
    const history = [session, ...state.history].slice(0, MAX_HISTORY);
    const next: QuantumState = {
      ...state,
      status: 'break',
      endsAt: null,
      remainingMs: 0,
      history,
    };
    store.setState(next);
    persistActive(next);
    persistHistory(history);
  }

  function refresh(): void {
    const state = store.getState();
    if (state.status !== 'running' || state.endsAt === null) return;
    const remaining = state.endsAt - now();
    if (remaining <= 0) {
      complete();
      return;
    }
    if (remaining !== state.remainingMs) {
      store.setState({ ...state, remainingMs: remaining });
    }
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== ACTIVE_KEY && event.key !== HISTORY_KEY) return;
    if (event.key === HISTORY_KEY) {
      const fresh = loadHistory(storage);
      store.setState({ ...store.getState(), history: fresh });
      return;
    }
    // ACTIVE_KEY changed in another tab — re-derive state.
    const persisted = loadActive(storage, now);
    const state = store.getState();
    if (persisted) {
      store.setState({
        ...state,
        status: 'running',
        endsAt: persisted.endsAt,
        durationMs: persisted.durationMs,
        remainingMs: Math.max(0, persisted.endsAt - now()),
      });
    } else if (state.status === 'running') {
      // Another tab cancelled the session.
      store.setState({
        ...state,
        status: 'idle',
        endsAt: null,
        remainingMs: state.durationMs,
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  function destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  }

  return { store, start, cancel, skipBreak, refresh, destroy };
}

let singleton: QuantumTimer | null = null;

/**
 * Return the process-singleton timer. Both the home widget and the
 * dedicated page hold a reference to the same instance, so subscribing
 * to it gives them identical state.
 */
export function getQuantumTimer(): QuantumTimer {
  if (!singleton) singleton = createQuantumTimer();
  return singleton;
}

export function formatQuantumTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
