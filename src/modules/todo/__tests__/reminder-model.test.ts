import { describe, expect, it } from 'vitest';
import {
  formatReminder,
  oneHourFrom,
  tomorrowAtNine,
  toLocalDateTimeValue,
} from '../reminder-model';

describe('To Do reminder pointers', () => {
  const now = new Date(2026, 7, 22, 15, 30, 0, 0);

  it('offers one hour without rounding away intent', () => {
    expect(oneHourFrom(now).getTime()).toBe(now.getTime() + 3_600_000);
  });

  it('offers tomorrow at local 9:00', () => {
    const result = tomorrowAtNine(now);
    expect(result.getDate()).toBe(23);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(0);
  });

  it('formats today and tomorrow as quiet pointers', () => {
    expect(
      formatReminder(new Date(2026, 7, 22, 16, 30).toISOString(), now)
    ).toMatch(/^Today · /);
    expect(
      formatReminder(new Date(2026, 7, 23, 9, 0).toISOString(), now)
    ).toMatch(/^Tomorrow · /);
  });

  it('creates the value expected by a local datetime input', () => {
    expect(toLocalDateTimeValue(now)).toBe('2026-08-22T15:30');
  });
});
