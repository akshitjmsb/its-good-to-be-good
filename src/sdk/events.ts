/**
 * Event bus — simple typed pub/sub shared by all modules in a session.
 *
 * Modules use this to broadcast cross-cutting events ("food:meal-logged",
 * "timer:session-complete", etc.) without taking direct references to
 * each other. The shell can also subscribe to surface user-visible
 * notifications.
 */

import type { EventBus, EventListener } from './types';

type AnyListener = EventListener<unknown>;

export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<AnyListener>>();

  function on<T = unknown>(event: string, listener: EventListener<T>): () => void {
    const set = listeners.get(event) ?? new Set<AnyListener>();
    set.add(listener as AnyListener);
    listeners.set(event, set);
    return () => off(event, listener);
  }

  function off<T = unknown>(event: string, listener: EventListener<T>): void {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(listener as AnyListener);
    if (set.size === 0) listeners.delete(event);
  }

  function emit<T = unknown>(event: string, payload?: T): void {
    const set = listeners.get(event);
    if (!set) return;
    // Snapshot so a listener that unsubscribes during emit doesn't
    // skip a sibling.
    [...set].forEach(l => {
      try {
        l(payload as unknown);
      } catch (err) {
        console.error(`[king-sdk] event listener for "${event}" threw:`, err);
      }
    });
  }

  function listenerCount(event: string): number {
    return listeners.get(event)?.size ?? 0;
  }

  return { on, off, emit, listenerCount };
}

/**
 * Shared singleton bus used by the SDK factory. Tests can mint a fresh bus
 * via createEventBus().
 */
export const sharedEventBus: EventBus = createEventBus();
