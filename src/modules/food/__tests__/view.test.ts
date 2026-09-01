import { describe, expect, it } from 'vitest';
import {
  mealCategoryForHour,
  formatGlycemicIndex,
  renderFoodView,
  toggleMealChoice,
} from '../view';

function createContainer(): HTMLElement {
  return {
    innerHTML: '',
    querySelector: () => null,
  } as unknown as HTMLElement;
}

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
    const container = createContainer();
    renderFoodView(container, new Date(2026, 7, 15, 13));

    expect(container.innerHTML).toContain('Dress the carb');
    expect(container.innerHTML).toContain('Protein · fat · fibre');
    expect(container.innerHTML).toContain('Eat in order');
    expect(container.innerHTML).toContain('Protein · veg · carb');
    expect(container.innerHTML).not.toContain('Never eat a naked carb.');
    expect(container.innerHTML.split('<details')[0]).not.toContain('<button');
    expect(container.innerHTML).not.toContain('Mark eaten');
    expect(container.innerHTML).not.toContain('Rest of the day');
  });

  it('keeps one contextual meal idea behind disclosure', () => {
    const container = createContainer();
    renderFoodView(container, new Date(2026, 7, 15, 13));

    expect(container.innerHTML).toContain(
      '<details class="food-disclosure food-idea">'
    );
    expect(container.innerHTML).toContain('<summary>Meal idea');
    expect(container.innerHTML).not.toContain('Lunch');
    expect(container.innerHTML).toContain('food-meal__components');
    expect(container.innerHTML).not.toContain('food-view__name');
  });

  it('offers the approved Greek-Indian food shelf without beef', () => {
    const container = createContainer();
    renderFoodView(container, new Date(2026, 7, 15, 13));

    expect(container.innerHTML).toContain('Build a meal');
    expect(container.innerHTML).toContain('Your meal');
    expect(container.innerHTML).toContain('Protein');
    expect(container.innerHTML).toContain('Greek yogurt');
    expect(container.innerHTML).toContain('GI 12');
    expect(container.innerHTML).toContain('Lamb');
    expect(container.innerHTML).not.toContain('GI n/a');
    expect(container.innerHTML).toContain('Vegetables &#x2F; fibre');
    expect(container.innerHTML).toContain('Olive oil');
    expect(container.innerHTML).toContain('Roti');
    expect(container.innerHTML).toContain('Pita');
    expect(container.innerHTML).toContain('Fruit — earlier');
    expect(container.innerHTML).toContain('aria-pressed="false"');
    expect(container.innerHTML).toContain('data-category-index="0"');
    expect(container.innerHTML.toLowerCase()).not.toContain('beef');
  });

  it('shows meal components in protein, fibre, carb order', () => {
    const container = createContainer();
    renderFoodView(container, new Date(2026, 7, 31, 8));

    expect(container.innerHTML).toContain(
      'Greek yogurt · carrot + peas · upma'
    );
  });
});

describe('toggleMealChoice', () => {
  it('selects one food per category', () => {
    const protein = toggleMealChoice([], 0, 'Chicken');
    const meal = toggleMealChoice(protein, 1, 'Greek salad');

    expect(meal).toEqual(['Chicken', 'Greek salad']);
  });

  it('replaces the choice in the same category', () => {
    const first = toggleMealChoice([], 0, 'Chicken');
    const replaced = toggleMealChoice(first, 0, 'Salmon');

    expect(replaced).toEqual(['Salmon']);
  });

  it('removes a selected food when tapped again', () => {
    const selected = toggleMealChoice([], 0, 'Chicken');
    const removed = toggleMealChoice(selected, 0, 'Chicken');

    expect(removed).toEqual([undefined]);
  });
});

describe('formatGlycemicIndex', () => {
  it('renders measured values and leaves non-applicable foods blank', () => {
    expect(formatGlycemicIndex({ low: 44 })).toBe('44');
    expect(formatGlycemicIndex({ low: 43, high: 74 })).toBe('43–74');
    expect(formatGlycemicIndex(null)).toBe('');
  });
});
