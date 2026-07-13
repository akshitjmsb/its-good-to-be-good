import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CountdownSession,
  createCountdownTimer,
  currentStreak,
  formatCountdownTime,
  sessionsThisWeek,
  totalMinutes,
} from '../countdownTimer';

const NS = 'test-timer';
const ACTIVE_KEY = `${NS}:active`;
const HISTORY_KEY = `${NS}:history`;
const DEFAULT_MS = 30 * 60 * 1000;

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe('formatCountdownTime', () => {
  it('formats whole minutes', () => {
    expect(formatCountdownTime(30 * 60 * 1000)).toBe('30:00');
  });

  it('rounds up partial seconds', () => {
    expect(formatCountdownTime(500)).toBe('00:01');
  });

  it('clamps at 00:00 for negative remaining', () => {
    expect(formatCountdownTime(-1234)).toBe('00:00');
  });
});

describe('createCountdownTimer', () => {
  let now: number;
  let storage: MemoryStorage;

  beforeEach(() => {
    now = 1_700_000_000_000;
    storage = new MemoryStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function build() {
    return createCountdownTimer({
      namespace: NS,
      defaultDurationMs: DEFAULT_MS,
      storage,
      now: () => now,
    });
  }

  it('starts in idle with the configured default duration', () => {
    const timer = build();
    expect(timer.store.getState().status).toBe('idle');
    expect(timer.store.getState().remainingMs).toBe(DEFAULT_MS);
    expect(timer.store.getState().history).toEqual([]);
    timer.destroy();
  });

  it('start() persists endsAt and flips status to running', () => {
    const timer = build();
    timer.start();
    const state = timer.store.getState();
    expect(state.status).toBe('running');
    expect(state.endsAt).toBe(now + DEFAULT_MS);
    expect(storage.getItem(ACTIVE_KEY)).toBeTruthy();
    timer.destroy();
  });

  it('cancel() clears endsAt and removes the persisted active session', () => {
    const timer = build();
    timer.start();
    timer.cancel();
    expect(timer.store.getState().status).toBe('idle');
    expect(timer.store.getState().endsAt).toBeNull();
    expect(storage.getItem(ACTIVE_KEY)).toBeNull();
    timer.destroy();
  });

  it('refresh() decrements remainingMs based on now()', () => {
    const timer = build();
    timer.start();
    now += 5_000;
    timer.refresh();
    expect(timer.store.getState().remainingMs).toBe(DEFAULT_MS - 5_000);
    timer.destroy();
  });

  it('refresh() at end of session transitions to break and records history', () => {
    const timer = build();
    timer.start();
    now += DEFAULT_MS + 1;
    timer.refresh();
    const state = timer.store.getState();
    expect(state.status).toBe('break');
    expect(state.endsAt).toBeNull();
    expect(state.history).toHaveLength(1);
    expect(state.history[0].durationMs).toBe(DEFAULT_MS);
    expect(storage.getItem(HISTORY_KEY)).toBeTruthy();
    expect(storage.getItem(ACTIVE_KEY)).toBeNull();
    timer.destroy();
  });

  it('skipBreak() returns to idle after a completion', () => {
    const timer = build();
    timer.start();
    now += DEFAULT_MS + 1;
    timer.refresh();
    expect(timer.store.getState().status).toBe('break');
    timer.skipBreak();
    expect(timer.store.getState().status).toBe('idle');
    expect(timer.store.getState().remainingMs).toBe(DEFAULT_MS);
    timer.destroy();
  });

  it('setDuration() updates duration only when idle', () => {
    const timer = build();
    timer.setDuration(5 * 60 * 1000);
    expect(timer.store.getState().durationMs).toBe(5 * 60 * 1000);
    expect(timer.store.getState().remainingMs).toBe(5 * 60 * 1000);
    timer.start();
    // mid-run setDuration is a no-op
    timer.setDuration(20 * 60 * 1000);
    expect(timer.store.getState().durationMs).toBe(5 * 60 * 1000);
    timer.destroy();
  });

  it('setDuration() ignores non-finite or non-positive values', () => {
    const timer = build();
    timer.setDuration(0);
    timer.setDuration(-1);
    timer.setDuration(Number.NaN);
    expect(timer.store.getState().durationMs).toBe(DEFAULT_MS);
    timer.destroy();
  });

  it('rehydrates a still-running session from storage', () => {
    const first = build();
    first.start();
    first.destroy();
    now += 60_000;
    const second = build();
    const state = second.store.getState();
    expect(state.status).toBe('running');
    expect(state.remainingMs).toBe(DEFAULT_MS - 60_000);
    second.destroy();
  });

  it('discards an expired persisted session on rehydrate', () => {
    const first = build();
    first.start();
    first.destroy();
    now += DEFAULT_MS + 1;
    const second = build();
    expect(second.store.getState().status).toBe('idle');
    expect(storage.getItem(ACTIVE_KEY)).toBeNull();
    second.destroy();
  });

  it('history loads from storage on init and is capped to 20', () => {
    const long = JSON.stringify(
      Array.from({ length: 50 }, (_, i) => ({
        completedAt: new Date(now - i * 1000).toISOString(),
        durationMs: DEFAULT_MS,
      }))
    );
    storage.setItem(HISTORY_KEY, long);
    const timer = build();
    expect(timer.store.getState().history).toHaveLength(20);
    timer.destroy();
  });

  it('subscribers fire on state transitions', () => {
    const timer = build();
    const listener = vi.fn();
    timer.store.subscribe(listener);
    timer.start();
    timer.cancel();
    expect(listener).toHaveBeenCalledTimes(2);
    timer.destroy();
  });

  it('two namespaces hold independent state', () => {
    const a = createCountdownTimer({
      namespace: 'ns-a',
      defaultDurationMs: 60_000,
      storage,
      now: () => now,
    });
    const b = createCountdownTimer({
      namespace: 'ns-b',
      defaultDurationMs: 90_000,
      storage,
      now: () => now,
    });
    a.start();
    expect(a.store.getState().status).toBe('running');
    expect(b.store.getState().status).toBe('idle');
    expect(storage.getItem('ns-a:active')).toBeTruthy();
    expect(storage.getItem('ns-b:active')).toBeNull();
    a.destroy();
    b.destroy();
  });
});

describe('sessionsThisWeek', () => {
  // Use a Wednesday at noon as "now" so we have well-defined window edges.
  const wedNoon = new Date(2026, 4, 13, 12, 0, 0).getTime();

  function session(date: Date): CountdownSession {
    return { completedAt: date.toISOString(), durationMs: 600_000 };
  }

  it('counts sessions from Sunday at 00:00 of the current week', () => {
    const history = [
      session(new Date(2026, 4, 13, 8)), // Wed (this week) ✓
      session(new Date(2026, 4, 11, 21)), // Mon (this week) ✓
      session(new Date(2026, 4, 10, 0)), // Sun (this week, edge) ✓
      session(new Date(2026, 4, 9, 23, 59)), // Sat last week ✗
    ];
    expect(sessionsThisWeek(history, wedNoon)).toBe(3);
  });

  it('returns 0 when history is empty', () => {
    expect(sessionsThisWeek([], wedNoon)).toBe(0);
  });
});

describe('totalMinutes', () => {
  it('sums durations into whole minutes', () => {
    expect(
      totalMinutes([
        { completedAt: 'x', durationMs: 600_000 },
        { completedAt: 'x', durationMs: 900_000 },
        { completedAt: 'x', durationMs: 30_000 }, // 0.5 min, rounds to 1
      ])
    ).toBe(26); // 10 + 15 + 1
  });

  it('returns 0 for empty', () => {
    expect(totalMinutes([])).toBe(0);
  });
});

describe('currentStreak', () => {
  function session(date: Date): CountdownSession {
    return { completedAt: date.toISOString(), durationMs: 600_000 };
  }

  it('returns 0 on empty history', () => {
    expect(currentStreak([], Date.now())).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const today = new Date(2026, 4, 13, 14);
    const history = [
      session(new Date(2026, 4, 13, 8)),
      session(new Date(2026, 4, 12, 21)),
      session(new Date(2026, 4, 11, 7)),
    ];
    expect(currentStreak(history, today.getTime())).toBe(3);
  });

  it('still counts the streak when today has no session yet (anchors at yesterday)', () => {
    const today = new Date(2026, 4, 13, 9);
    const history = [
      session(new Date(2026, 4, 12, 19)),
      session(new Date(2026, 4, 11, 19)),
      session(new Date(2026, 4, 10, 19)),
    ];
    expect(currentStreak(history, today.getTime())).toBe(3);
  });

  it('returns 0 if neither today nor yesterday has a session', () => {
    const today = new Date(2026, 4, 13, 12);
    const history = [
      session(new Date(2026, 4, 11, 19)), // 2 days ago
      session(new Date(2026, 4, 10, 19)),
    ];
    expect(currentStreak(history, today.getTime())).toBe(0);
  });

  it('breaks the streak on a missed day', () => {
    const today = new Date(2026, 4, 13, 14);
    const history = [
      session(new Date(2026, 4, 13, 8)), // today
      session(new Date(2026, 4, 12, 21)), // yesterday
      // 2026-05-11 missing
      session(new Date(2026, 4, 10, 19)),
    ];
    expect(currentStreak(history, today.getTime())).toBe(2);
  });

  it('multiple sessions on the same day count as one day', () => {
    const today = new Date(2026, 4, 13, 14);
    const history = [
      session(new Date(2026, 4, 13, 8)),
      session(new Date(2026, 4, 13, 12)),
      session(new Date(2026, 4, 12, 19)),
    ];
    expect(currentStreak(history, today.getTime())).toBe(2);
  });
});
