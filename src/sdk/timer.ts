/**
 * Timer adapter — wraps src/platform/countdownTimer.ts.
 *
 * Namespaces are automatically prefixed with the module id so timers from
 * two modules don't share storage.
 */

import {
  createCountdownTimer,
  type CountdownState,
} from '../platform/countdownTimer';
import type { TimerAdapter, TimerHandle, TimerState } from './types';

function toExternalState(state: CountdownState): TimerState {
  return {
    status: state.status,
    endsAt: state.endsAt,
    remainingMs: state.remainingMs,
    durationMs: state.durationMs,
  };
}

export function createTimerAdapter(moduleId: string): TimerAdapter {
  return {
    create({ name, defaultDurationMs }): TimerHandle {
      const timer = createCountdownTimer({
        namespace: `king:${moduleId}:timer:${name}`,
        defaultDurationMs,
      });

      return {
        start: () => timer.start(),
        cancel: () => timer.cancel(),
        skipBreak: () => timer.skipBreak(),
        setDuration: ms => timer.setDuration(ms),
        refresh: () => timer.refresh(),
        destroy: () => timer.destroy(),
        getState: () => toExternalState(timer.store.getState()),
        subscribe: listener =>
          timer.store.subscribe(state => listener(toExternalState(state))),
      };
    },
  };
}
