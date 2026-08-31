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
  it('leads with the two universal actions', () => {
    const container = { innerHTML: '' } as HTMLElement;
    renderFoodView(container, new Date(2026, 7, 15, 13));

    expect(container.innerHTML).toContain('Dress the carb');
    expect(container.innerHTML).toContain('Protein · fat · fibre');
    expect(container.innerHTML).toContain('Eat in order');
    expect(container.innerHTML).toContain('Protein · veg · carb');
    expect(container.innerHTML).not.toContain('Never eat a naked carb.');
    expect(container.innerHTML).not.toContain('<button');
    expect(container.innerHTML).not.toContain('Mark eaten');
    expect(container.innerHTML).not.toContain('Rest of the day');
  });

  it('keeps one contextual meal idea behind disclosure', () => {
    const container = { innerHTML: '' } as HTMLElement;
    renderFoodView(container, new Date(2026, 7, 15, 13));

    expect(container.innerHTML).toContain('<details class="food-idea">');
    expect(container.innerHTML).toContain('<summary>Meal idea');
    expect(container.innerHTML).not.toContain('Lunch');
    expect(container.innerHTML).toContain('food-meal__components');
    expect(container.innerHTML).not.toContain('food-view__name');
  });

  it('shows meal components in protein, fibre, carb order', () => {
    const container = { innerHTML: '' } as HTMLElement;
    renderFoodView(container, new Date(2026, 7, 31, 8));

    expect(container.innerHTML).toContain(
      'Greek yogurt · carrot + peas · upma'
    );
  });
});
