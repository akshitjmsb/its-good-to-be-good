/**
 * Lightweight pub/sub store. Listeners receive the full state on every change.
 * setState accepts either a partial patch (shallow-merged) or a reducer.
 */
export type Listener<T> = (state: T) => void;
export type Updater<T> = Partial<T> | ((prev: T) => T);

export interface Store<T extends object> {
  getState: () => T;
  setState: (updater: Updater<T>) => void;
  subscribe: (listener: Listener<T>) => () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();

  function getState(): T {
    return state;
  }

  function setState(updater: Updater<T>): void {
    const next =
      typeof updater === 'function'
        ? (updater as (prev: T) => T)(state)
        : { ...state, ...updater };

    if (Object.is(next, state)) return;
    state = next;
    listeners.forEach(listener => listener(state));
  }

  function subscribe(listener: Listener<T>): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { getState, setState, subscribe };
}
