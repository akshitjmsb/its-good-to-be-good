/**
 * Local write-ahead log for the To Do module.
 *
 * Every mutation writes the full task list (plus pending delete tombstones)
 * to localStorage *before* the network save is attempted. If the page closes,
 * crashes, or the device is offline, nothing is lost — the next boot reads the
 * WAL and merges it with whatever the server eventually returns. The WAL is
 * cleared only once the server has confirmed an up-to-date save.
 *
 * Storage is injected (not imported) so this is unit-testable in the Node test
 * environment and degrades gracefully when localStorage is unavailable
 * (private mode, quota, SSR) — every method is a safe no-op in that case.
 */

import type { Task } from '../../types';

export interface WalSnapshot {
  tasks: Task[];
  deletedIds: string[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function walKeyFor(userId: string): string {
  return `king:todo:wal:${userId}`;
}

export interface Wal {
  read(): WalSnapshot | null;
  write(snapshot: WalSnapshot): void;
  clear(): void;
}

export function createWal(storage: StorageLike | null, key: string): Wal {
  return {
    read(): WalSnapshot | null {
      if (!storage) return null;
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<WalSnapshot> | null;
        if (!parsed || !Array.isArray(parsed.tasks)) return null;
        return {
          tasks: parsed.tasks as Task[],
          deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
        };
      } catch {
        // Corrupt/partial WAL — treat as absent rather than crash the boot.
        return null;
      }
    },

    write(snapshot: WalSnapshot): void {
      if (!storage) return;
      try {
        storage.setItem(key, JSON.stringify(snapshot));
      } catch {
        // Quota / serialization failure — losing the WAL is acceptable; the
        // in-memory state and the network save are still in play.
      }
    },

    clear(): void {
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Best-effort access to `localStorage`. Returns null when it is missing or
 * throws on first touch (Safari private mode), so callers get a WAL that
 * no-ops instead of an exception.
 */
export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__king_todo_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}
