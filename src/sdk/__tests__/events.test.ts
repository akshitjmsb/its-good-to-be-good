import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../events';

describe('event bus', () => {
  it('delivers payloads to registered listeners', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.on<{ value: number }>('thing', listener);

    bus.emit('thing', { value: 42 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it('returns an unsubscribe function from on()', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    const off = bus.on('thing', listener);

    off();
    bus.emit('thing', 'payload');

    expect(listener).not.toHaveBeenCalled();
    expect(bus.listenerCount('thing')).toBe(0);
  });

  it('isolates listeners per event name', () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('a', a);
    bus.on('b', b);

    bus.emit('a', 1);

    expect(a).toHaveBeenCalledWith(1);
    expect(b).not.toHaveBeenCalled();
  });

  it('off() removes a specific listener without affecting siblings', () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('thing', a);
    bus.on('thing', b);

    bus.off('thing', a);
    bus.emit('thing');

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('thing')).toBe(1);
  });

  it('handles listener throwing without breaking siblings', () => {
    const bus = createEventBus();
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwing = vi.fn(() => {
      throw new Error('boom');
    });
    const sibling = vi.fn();
    bus.on('thing', throwing);
    bus.on('thing', sibling);

    bus.emit('thing', 'payload');

    expect(throwing).toHaveBeenCalled();
    expect(sibling).toHaveBeenCalled();
    consoleErr.mockRestore();
  });

  it('a listener can unsubscribe during emit without skipping siblings', () => {
    const bus = createEventBus();
    const sibling = vi.fn();
    const selfDestruct = vi.fn(() => off());
    const off = bus.on('thing', selfDestruct);
    bus.on('thing', sibling);

    bus.emit('thing');

    expect(selfDestruct).toHaveBeenCalledTimes(1);
    expect(sibling).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('thing')).toBe(1);
  });
});
