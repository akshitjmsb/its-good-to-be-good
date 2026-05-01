import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createQuantumTimer,
  formatQuantumTime,
  DEFAULT_DURATION_MS,
} from '../quantumTimer';

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
  size(): number {
    return this.map.size;
  }
  raw(): Map<string, string> {
    return this.map;
  }
}

describe('formatQuantumTime', () => {
  it('formats whole minutes', () => {
    expect(formatQuantumTime(30 * 60 * 1000)).toBe('30:00');
  });

  it('rounds up partial seconds (display reads "1 second remaining" until 0)', () => {
    expect(formatQuantumTime(500)).toBe('00:01');
  });

  it('clamps at 00:00 for negative remaining', () => {
    expect(formatQuantumTime(-1234)).toBe('00:00');
  });
});

describe('createQuantumTimer', () => {
  let now: number;
  let storage: MemoryStorage;

  beforeEach(() => {
    now = 1_700_000_000_000; // arbitrary fixed clock
    storage = new MemoryStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in idle with the configured duration', () => {
    const timer = createQuantumTimer({
      storage,
      now: () => now,
      durationMs: DEFAULT_DURATION_MS,
    });
    expect(timer.store.getState().status).toBe('idle');
    expect(timer.store.getState().remainingMs).toBe(DEFAULT_DURATION_MS);
    expect(timer.store.getState().history).toEqual([]);
    timer.destroy();
  });

  it('start() persists endsAt to storage and flips status to running', () => {
    const timer = createQuantumTimer({ storage, now: () => now });
    timer.start();
    const state = timer.store.getState();
    expect(state.status).toBe('running');
    expect(state.endsAt).toBe(now + DEFAULT_DURATION_MS);
    expect(storage.getItem('quantum-timer:active')).toBeTruthy();
    timer.destroy();
  });

  it('cancel() clears endsAt and removes the persisted active session', () => {
    const timer = createQuantumTimer({ storage, now: () => now });
    timer.start();
    timer.cancel();
    expect(timer.store.getState().status).toBe('idle');
    expect(timer.store.getState().endsAt).toBeNull();
    expect(storage.getItem('quantum-timer:active')).toBeNull();
    timer.destroy();
  });

  it('refresh() decrements remainingMs based on Date.now()', () => {
    const timer = createQuantumTimer({ storage, now: () => now });
    timer.start();
    now += 5_000;
    timer.refresh();
    expect(timer.store.getState().remainingMs).toBe(DEFAULT_DURATION_MS - 5_000);
    timer.destroy();
  });

  it('refresh() at end of session transitions to break and records history', () => {
    const timer = createQuantumTimer({ storage, now: () => now });
    timer.start();
    now += DEFAULT_DURATION_MS + 1;
    timer.refresh();
    const state = timer.store.getState();
    expect(state.status).toBe('break');
    expect(state.endsAt).toBeNull();
    expect(state.history).toHaveLength(1);
    expect(state.history[0].durationMs).toBe(DEFAULT_DURATION_MS);
    expect(storage.getItem('quantum-timer:history')).toBeTruthy();
    expect(storage.getItem('quantum-timer:active')).toBeNull();
    timer.destroy();
  });

  it('skipBreak() returns to idle after a completion', () => {
    const timer = createQuantumTimer({ storage, now: () => now });
    timer.start();
    now += DEFAULT_DURATION_MS + 1;
    timer.refresh();
    expect(timer.store.getState().status).toBe('break');
    timer.skipBreak();
    expect(timer.store.getState().status).toBe('idle');
    expect(timer.store.getState().remainingMs).toBe(DEFAULT_DURATION_MS);
    timer.destroy();
  });

  it('rehydrates a still-running session from storage', () => {
    const first = createQuantumTimer({ storage, now: () => now });
    first.start();
    first.destroy();
    now += 60_000; // a minute later, fresh tab opens
    const second = createQuantumTimer({ storage, now: () => now });
    const state = second.store.getState();
    expect(state.status).toBe('running');
    expect(state.remainingMs).toBe(DEFAULT_DURATION_MS - 60_000);
    second.destroy();
  });

  it('discards an expired persisted session on rehydrate', () => {
    const first = createQuantumTimer({ storage, now: () => now });
    first.start();
    first.destroy();
    now += DEFAULT_DURATION_MS + 1; // session would have ended
    const second = createQuantumTimer({ storage, now: () => now });
    expect(second.store.getState().status).toBe('idle');
    expect(storage.getItem('quantum-timer:active')).toBeNull();
    second.destroy();
  });

  it('history loads from storage on init and is capped to MAX_HISTORY', () => {
    const long = JSON.stringify(
      Array.from({ length: 50 }, (_, i) => ({
        completedAt: new Date(now - i * 1000).toISOString(),
        durationMs: DEFAULT_DURATION_MS,
      }))
    );
    storage.setItem('quantum-timer:history', long);
    const timer = createQuantumTimer({ storage, now: () => now });
    expect(timer.store.getState().history).toHaveLength(20);
    timer.destroy();
  });

  it('subscribers fire on state transitions', () => {
    const timer = createQuantumTimer({ storage, now: () => now });
    const listener = vi.fn();
    timer.store.subscribe(listener);
    timer.start();
    timer.cancel();
    expect(listener).toHaveBeenCalledTimes(2);
    timer.destroy();
  });
});
