/**
 * Meditate timer — a namespaced view of the shared countdown core.
 *
 * Singleton survives navigation within a tab (and survives reload via
 * localStorage). Independent from the Quantum timer (different
 * namespace = different storage rows = independent history).
 */

import {
  type CountdownSession,
  type CountdownState,
  type CountdownStatus,
  type CountdownTimer,
  createCountdownTimer,
  formatCountdownTime,
} from './countdownTimer';

export const DEFAULT_DURATION_MS = 10 * 60 * 1000;
const NAMESPACE = 'meditate-timer';

export type MeditateStatus = CountdownStatus;
export type MeditateSession = CountdownSession;
export type MeditateState = CountdownState;
export type MeditateTimer = CountdownTimer;

let singleton: MeditateTimer | null = null;

export function getMeditateTimer(): MeditateTimer {
  if (!singleton) {
    singleton = createCountdownTimer({
      namespace: NAMESPACE,
      defaultDurationMs: DEFAULT_DURATION_MS,
    });
  }
  return singleton;
}

export const formatMeditateTime = formatCountdownTime;
