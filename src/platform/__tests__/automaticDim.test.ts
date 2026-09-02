import { describe, expect, it, vi } from 'vitest';
import { applyAutomaticDim, isAutomaticDimHour } from '../automaticDim';

describe('automatic dim', () => {
  it.each([
    [0, true],
    [4, true],
    [5, false],
    [12, false],
    [17, false],
    [18, true],
    [23, true],
  ] as const)('maps %s:00 to dim=%s', (hour, dimmed) => {
    expect(isAutomaticDimHour(hour)).toBe(dimmed);
  });

  it('applies the shared class from local time', () => {
    const toggle = vi.fn();
    const body = { classList: { toggle } } as unknown as Pick<
      HTMLElement,
      'classList'
    >;

    applyAutomaticDim(body, new Date(2026, 8, 1, 21));

    expect(toggle).toHaveBeenCalledWith('system-dimmed', true);
  });
});
