import { describe, expect, it } from 'vitest';
import { mealCategoryForHour } from '../view';

describe('mealCategoryForHour', () => {
  it.each([
    [6, 'breakfast'],
    [9, 'breakfast'],
    [10, 'lunch'],
    [14, 'lunch'],
    [15, 'snack'],
    [17, 'snack'],
    [18, 'dinner'],
    [23, 'dinner'],
  ] as const)('maps %s:00 to %s', (hour, category) => {
    expect(mealCategoryForHour(hour)).toBe(category);
  });
});
