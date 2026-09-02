import { describe, expect, it } from 'vitest';
import { OUTSIDE_DURATION_MS, sleepActionForHour } from '../sleep';

describe('sleepActionForHour', () => {
  it.each([
    [0, 'dim'],
    [4, 'dim'],
    [5, 'outside'],
    [12, 'outside'],
    [17, 'outside'],
    [18, 'dim'],
    [23, 'dim'],
  ] as const)('uses %s:00 for the %s action', (hour, action) => {
    expect(sleepActionForHour(hour)).toBe(action);
  });

  it('keeps the outside action to ten minutes', () => {
    expect(OUTSIDE_DURATION_MS).toBe(600_000);
  });
});
