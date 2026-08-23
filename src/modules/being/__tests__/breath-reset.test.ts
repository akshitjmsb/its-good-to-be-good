import { describe, expect, it } from 'vitest';
import {
  createBreathResetSound,
  createBreathResetController,
  RESET_CYCLES,
  RESET_EXHALE_MS,
  RESET_INHALE_MS,
  RESET_OM_VOLUME,
  type BreathResetState,
} from '../breath-reset';

function harness() {
  let nextId = 1;
  const timers = new Map<number, { callback: () => void; delayMs: number }>();
  const states: BreathResetState[] = [];
  const controller = createBreathResetController({
    scheduler: {
      set(callback, delayMs) {
        const id = nextId;
        nextId += 1;
        timers.set(id, { callback, delayMs });
        return id;
      },
      clear(timerId) {
        timers.delete(timerId);
      },
    },
    onChange: state => states.push(state),
  });
  const runNext = () => {
    const entry = timers.entries().next().value as
      | [number, { callback: () => void; delayMs: number }]
      | undefined;
    if (!entry) throw new Error('No scheduled phase');
    timers.delete(entry[0]);
    entry[1].callback();
    return entry[1].delayMs;
  };
  return { controller, runNext, states, timers };
}

describe('three breath centre reset', () => {
  it('runs three 4-in / 6-out cycles and returns to rest', () => {
    const { controller, runNext, states } = harness();
    controller.start();

    for (let cycle = 1; cycle <= RESET_CYCLES; cycle += 1) {
      expect(states.at(-1)).toMatchObject({ cycle, phase: 'inhale' });
      expect(runNext()).toBe(RESET_INHALE_MS);
      expect(states.at(-1)).toMatchObject({ cycle, phase: 'exhale' });
      expect(runNext()).toBe(RESET_EXHALE_MS);
    }

    expect(controller.getState()).toEqual({
      active: false,
      cycle: 0,
      phase: 'idle',
    });
  });

  it('stops immediately on a second tap and clears the pending phase', () => {
    const { controller, timers } = harness();
    controller.toggle();
    expect(controller.getState().active).toBe(true);
    expect(timers.size).toBe(1);

    controller.toggle();
    expect(controller.getState().active).toBe(false);
    expect(timers.size).toBe(0);
  });

  it('does not start a second overlapping reset', () => {
    const { controller, states, timers } = harness();
    controller.start();
    controller.start();
    expect(states).toHaveLength(1);
    expect(timers.size).toBe(1);
  });
});

describe('centre reset OM', () => {
  function audioHarness(play: () => Promise<void> | void = () => undefined) {
    const calls = { pause: 0, play: 0 };
    const audio = {
      loop: false,
      preload: '',
      volume: 1,
      currentTime: 12,
      play: () => {
        calls.play += 1;
        return play();
      },
      pause: () => {
        calls.pause += 1;
      },
    };
    return { audio, calls };
  }

  it('configures and starts the existing OM as a quiet loop', () => {
    const { audio, calls } = audioHarness();
    const sound = createBreathResetSound(audio);

    expect(audio.loop).toBe(true);
    expect(audio.preload).toBe('auto');
    expect(audio.volume).toBe(RESET_OM_VOLUME);
    sound.start();
    expect(calls.play).toBe(1);
    expect(audio.currentTime).toBe(0);
  });

  it('stops and rewinds immediately', () => {
    const { audio, calls } = audioHarness();
    const sound = createBreathResetSound(audio);
    sound.start();
    audio.currentTime = 7;
    sound.stop();
    expect(calls.pause).toBe(1);
    expect(audio.currentTime).toBe(0);
  });

  it('lets the ring continue when playback is rejected', async () => {
    const rejected = new Error('blocked');
    const errors: unknown[] = [];
    const { audio } = audioHarness(() => Promise.reject(rejected));
    const sound = createBreathResetSound(audio, error => errors.push(error));
    expect(() => sound.start()).not.toThrow();
    await Promise.resolve();
    expect(errors).toEqual([rejected]);
  });
});
