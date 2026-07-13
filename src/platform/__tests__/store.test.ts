import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../store';

describe('createStore', () => {
  it('returns the initial state from getState', () => {
    const store = createStore({ count: 0, label: 'a' });
    expect(store.getState()).toEqual({ count: 0, label: 'a' });
  });

  it('shallow-merges partial patches into state', () => {
    const store = createStore({ count: 0, label: 'a' });
    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1, label: 'a' });
  });

  it('accepts a reducer-style updater', () => {
    const store = createStore({ count: 0 });
    store.setState(prev => ({ count: prev.count + 5 }));
    expect(store.getState().count).toBe(5);
  });

  it('notifies subscribers on every state change', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 1 });
    store.setState({ count: 2 });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ count: 2 });
  });

  it('skips listener notification when reducer returns the same reference', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState(prev => prev);
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe stops further notifications', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setState({ count: 1 });
    unsubscribe();
    store.setState({ count: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
