import { describe, expect, it } from 'vitest';
import { getActiveContentDate, getCanonicalTime, getTodayKey } from '../time';

describe('getCanonicalTime', () => {
  it('returns a date and hour', () => {
    const result = getCanonicalTime();

    expect(result).toHaveProperty('now');
    expect(result).toHaveProperty('hour');
    expect(result.now).toBeInstanceOf(Date);
    expect(typeof result.hour).toBe('number');
  });

  it('returns hour in 0..23', () => {
    const result = getCanonicalTime();
    expect(result.hour).toBeGreaterThanOrEqual(0);
    expect(result.hour).toBeLessThanOrEqual(23);
  });
});

describe('getTodayKey', () => {
  it('returns YYYY-MM-DD', () => {
    expect(getTodayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getActiveContentDate', () => {
  it('returns a date', () => {
    expect(getActiveContentDate()).toBeInstanceOf(Date);
  });
});
