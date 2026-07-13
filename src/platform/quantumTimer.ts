/**
 * Quantum focus timer — a namespaced view of the shared countdown core.
 *
 * Both the home-page widget (top-right corner) and the dedicated
 * quantum.html page subscribe to this module's singleton, so they always
 * reflect identical state and survive in-tab navigation.
 */

import {
  type CountdownSession,
  type CountdownState,
  type CountdownStatus,
  type CountdownTimer,
  type CountdownTimerOptions,
  createCountdownTimer,
  formatCountdownTime,
} from './countdownTimer';

export const DEFAULT_DURATION_MS = 30 * 60 * 1000;
const NAMESPACE = 'quantum-timer';

// Re-exported under quantum-specific names for backwards compatibility
// with existing call sites in src/components/quantumTimer.ts and
// src/pages/quantum.ts.
export type QuantumStatus = CountdownStatus;
export type QuantumSession = CountdownSession;
export type QuantumState = CountdownState;
export type QuantumTimer = CountdownTimer;

export type QuantumTimerOptions = Partial<
  Omit<CountdownTimerOptions, 'namespace' | 'defaultDurationMs'>
> & {
  durationMs?: number;
};

export function createQuantumTimer(
  options: QuantumTimerOptions = {}
): QuantumTimer {
  return createCountdownTimer({
    namespace: NAMESPACE,
    defaultDurationMs: options.durationMs ?? DEFAULT_DURATION_MS,
    storage: options.storage,
    now: options.now,
  });
}

let singleton: QuantumTimer | null = null;

export function getQuantumTimer(): QuantumTimer {
  if (!singleton) singleton = createQuantumTimer();
  return singleton;
}

export const formatQuantumTime = formatCountdownTime;
