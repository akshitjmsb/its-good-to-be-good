import { describe, expect, it } from 'vitest';
import { mealCategoryForHour, renderFoodView } from '../view';

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

describe('renderFoodView', () => {
  it('renders one meal and pointers without planning or tracking controls', () => {
    const container = { innerHTML: '' } as HTMLElement;
    renderFoodView(container, new Date(2026, 7, 15, 13));

    expect(container.innerHTML).toContain('Lunch');
    expect(container.innerHTML).toContain('Never eat a naked carb.');
    expect(container.innerHTML).toContain(
      'Protein + veg first · carb last.'
    );
    expect(container.innerHTML).not.toContain('<button');
    expect(container.innerHTML).not.toContain('<details');
    expect(container.innerHTML).not.toContain('Mark eaten');
    expect(container.innerHTML).not.toContain('Rest of the day');
  });
});
