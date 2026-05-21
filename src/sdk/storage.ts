/**
 * Storage adapter — namespaced localStorage wrapper with cross-tab sync.
 *
 * Every key is prefixed with `king:<moduleId>:` so a module can never
 * accidentally read or clobber another module's state. Values round-trip
 * through JSON.
 */

import type { StorageAdapter, StorageUnsubscribe } from './types';

type Listener = (raw: string | null) => void;

const KING_PREFIX = 'king:';

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createStorageAdapter(moduleId: string): StorageAdapter {
  const storage = getLocalStorage();
  const namespace = `${KING_PREFIX}${moduleId}:`;
  const listeners = new Map<string, Set<Listener>>();
  let storageHandler: ((e: StorageEvent) => void) | null = null;

  function fullKey(key: string): string {
    return `${namespace}${key}`;
  }

  function ensureListening(): void {
    if (storageHandler || typeof window === 'undefined') return;
    storageHandler = (event: StorageEvent) => {
      if (event.key === null) return;
      if (!event.key.startsWith(namespace)) return;
      const localKey = event.key.slice(namespace.length);
      const subs = listeners.get(localKey);
      if (!subs) return;
      subs.forEach(l => l(event.newValue));
    };
    window.addEventListener('storage', storageHandler);
  }

  function teardownIfIdle(): void {
    if (!storageHandler) return;
    if (listeners.size > 0) return;
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', storageHandler);
    }
    storageHandler = null;
  }

  return {
    get<T = unknown>(key: string): T | null {
      if (!storage) return null;
      try {
        const raw = storage.getItem(fullKey(key));
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    set<T = unknown>(key: string, value: T): void {
      if (!storage) return;
      try {
        storage.setItem(fullKey(key), JSON.stringify(value));
      } catch {
        /* quota / privacy mode — silently degrade */
      }
    },
    remove(key: string): void {
      if (!storage) return;
      try {
        storage.removeItem(fullKey(key));
      } catch {
        /* ignore */
      }
    },
    subscribe<T = unknown>(
      key: string,
      listener: (value: T | null) => void
    ): StorageUnsubscribe {
      ensureListening();
      const wrapped: Listener = raw => {
        if (raw === null) {
          listener(null);
          return;
        }
        try {
          listener(JSON.parse(raw) as T);
        } catch {
          listener(null);
        }
      };
      const subs = listeners.get(key) ?? new Set<Listener>();
      subs.add(wrapped);
      listeners.set(key, subs);
      return () => {
        subs.delete(wrapped);
        if (subs.size === 0) listeners.delete(key);
        teardownIfIdle();
      };
    },
  };
}
