export const OUTSIDE_DURATION_MS = 10 * 60 * 1_000;

export type SleepAction = 'outside' | 'dim';

/** Daylight is useful from early morning until the evening wind-down. */
export function sleepActionForHour(hour: number): SleepAction {
  return hour >= 5 && hour < 18 ? 'outside' : 'dim';
}
