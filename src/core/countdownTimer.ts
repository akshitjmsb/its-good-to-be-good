/**
 * Generic countdown timer core — used by both the Quantum focus widget
 * and the Meditate page.
 *
 * One namespace per surface keeps their localStorage rows separate and
 * makes their session histories independent. Each (namespace) gets its
 * own pub/sub store + cross-tab sync via the `storage` event. Pure
 * logic — no DOM access here so it tests in node.
 *
 * Status state machine:
 *   idle    — no session active
 *   running — session counting down (endsAt is set, in the future)
 *   break   — just finished, awaiting acknowledgment (consumers may
 *             show a "Done" / "Break!" banner before resetting to idle)
 */

import { createStore, type Store } from './store';

export type CountdownStatus = 'idle' | 'running' | 'break';

export interface CountdownSession {
  /** ISO 8601 string from `new Date(now).toISOString()`. */
  completedAt: string;
  /** Session length in milliseconds. */
  durationMs: number;
}

export interface CountdownState {
  status: CountdownStatus;
  /** Absolute end time in ms-since-epoch when status === 'running'. */
  endsAt: number | null;
  /** Remaining ms in the current session. Updated on each tick. */
  remainingMs: number;
  /** Configured session length. */
  durationMs: number;
  /** Most recent completed sessions, newest first, capped to MAX_HISTORY. */
  history: CountdownSession[];
}

const MAX_HISTORY = 20;

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

function loadActive(
  storage: Storage | null,
  key: string,
  now: Now
): PersistedActive | null {
  const raw = safeGetItem(storage, key);
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

function loadHistory(
  storage: Storage | null,
  key: string
): CountdownSession[] {
  const raw = safeGetItem(storage, key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is CountdownSession =>
          !!s &&
          typeof s.completedAt === 'string' &&
          typeof s.durationMs === 'number'
      )
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export interface CountdownTimerOptions {
  /** Used to namespace the localStorage keys (`${namespace}:active|history`). */
  namespace: string;
  /** Default session length when nothing is persisted. */
  defaultDurationMs: number;
  storage?: Storage | null;
  now?: Now;
}

export interface CountdownTimer {
  store: Store<CountdownState>;
  /** Begin the countdown using the current `durationMs`. */
  start: () => void;
  /** Stop without recording a completion. Resets to idle. */
  cancel: () => void;
  /** Dismiss the post-completion break and return to idle. */
  skipBreak: () => void;
  /** Configure session length. Only valid when idle. */
  setDuration: (ms: number) => void;
  /** Recompute remaining time from `now()`. Drives the visible tick. */
  refresh: () => void;
  /** Detach storage listener (for tests / page teardown). */
  destroy: () => void;
}

export function createCountdownTimer(
  options: CountdownTimerOptions
): CountdownTimer {
  const now: Now = options.now ?? (() => Date.now());
  const storage: Storage | null =
    options.storage !== undefined
      ? options.storage
      : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;

  const ACTIVE_KEY = `${options.namespace}:active`;
  const HISTORY_KEY = `${options.namespace}:history`;

  const persistedActive = loadActive(storage, ACTIVE_KEY, now);
  // If the persisted active row exists but has expired (or is unparseable),
  // scrub it so storage doesn't accumulate stale entries across sessions.
  if (!persistedActive && safeGetItem(storage, ACTIVE_KEY) !== null) {
    safeRemoveItem(storage, ACTIVE_KEY);
  }
  const history = loadHistory(storage, HISTORY_KEY);

  const initial: CountdownState = persistedActive
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
        remainingMs: options.defaultDurationMs,
        durationMs: options.defaultDurationMs,
        history,
      };

  const store = createStore<CountdownState>(initial);

  function persistActive(state: CountdownState): void {
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

  function persistHistory(history: CountdownSession[]): void {
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
    const next: CountdownState = {
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
    const next: CountdownState = {
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
    const next: CountdownState = {
      ...state,
      status: 'idle',
      endsAt: null,
      remainingMs: state.durationMs,
    };
    store.setState(next);
  }

  function setDuration(ms: number): void {
    if (!Number.isFinite(ms) || ms <= 0) return;
    const state = store.getState();
    if (state.status !== 'idle') return;
    if (ms === state.durationMs) return;
    store.setState({ ...state, durationMs: ms, remainingMs: ms });
  }

  function complete(): void {
    const state = store.getState();
    const session: CountdownSession = {
      completedAt: new Date(now()).toISOString(),
      durationMs: state.durationMs,
    };
    const history = [session, ...state.history].slice(0, MAX_HISTORY);
    const next: CountdownState = {
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
      const fresh = loadHistory(storage, HISTORY_KEY);
      store.setState({ ...store.getState(), history: fresh });
      return;
    }
    // ACTIVE_KEY changed in another tab — re-derive state.
    const persisted = loadActive(storage, ACTIVE_KEY, now);
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

  return { store, start, cancel, skipBreak, setDuration, refresh, destroy };
}

export function formatCountdownTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/* ── Stat helpers over a session history ─────────────────────────────────── */

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sessionsThisWeek(
  history: CountdownSession[],
  nowMs: number = Date.now()
): number {
  const cutoff = startOfWeek(new Date(nowMs)).getTime();
  return history.filter(s => {
    const t = new Date(s.completedAt).getTime();
    return Number.isFinite(t) && t >= cutoff;
  }).length;
}

export function totalMinutes(history: CountdownSession[]): number {
  const ms = history.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
  return Math.round(ms / 60_000);
}

/**
 * Consecutive days (inclusive) ending today (or yesterday if today
 * has no session) where ≥1 session was completed. A streak of 0 means
 * no recent activity within the last 24 h.
 */
export function currentStreak(
  history: CountdownSession[],
  nowMs: number = Date.now()
): number {
  if (history.length === 0) return 0;
  const days = new Set(
    history
      .map(s => new Date(s.completedAt))
      .filter(d => !Number.isNaN(d.getTime()))
      .map(dayKey)
  );

  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);

  // If today has no session yet, anchor at yesterday so a fresh morning
  // doesn't reset the streak prematurely.
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
