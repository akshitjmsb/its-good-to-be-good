import { describe, expect, it } from 'vitest';
import {
  __INTERNAL,
  FOOD_SHELF,
  getDayMealPlan,
  getStartOfWeek,
  MEAL_CATEGORIES,
  type Meal,
  type MealCategory,
} from '../data';

const {
  djb2,
  pickOne,
  poolFor,
  BREAKFAST_PLANT,
  BREAKFAST_ANIMAL,
  LUNCH_PLANT,
  LUNCH_ANIMAL,
  DINNER_PLANT,
  DINNER_ANIMAL,
  SNACK_PLANT,
  SNACK_ANIMAL,
} = __INTERNAL;

const PLANT_POOLS: ReadonlyArray<ReadonlyArray<Meal>> = [
  BREAKFAST_PLANT,
  LUNCH_PLANT,
  DINNER_PLANT,
  SNACK_PLANT,
];

const ANIMAL_POOLS: ReadonlyArray<ReadonlyArray<Meal>> = [
  BREAKFAST_ANIMAL,
  LUNCH_ANIMAL,
  DINNER_ANIMAL,
  SNACK_ANIMAL,
];

const ALL_POOLS: ReadonlyArray<ReadonlyArray<Meal>> = [
  ...PLANT_POOLS,
  ...ANIMAL_POOLS,
];

const ANIMAL_KEYWORDS = [
  'chicken',
  'pork',
  'lamb',
  'mutton',
  'bacon',
  'sausage',
  'turkey',
  'duck',
  'fish',
  'salmon',
  'tuna',
  'tilapia',
  'shrimp',
  'prawn',
  'egg',
  'eggs',
];
const BEEF_KEYWORDS = ['beef', 'veal'];

// Use word boundaries so "egg" doesn't match "eggplant" and "fish" doesn't
// match e.g. "fishcake" if a future meal happens to use that compound.
function containsKeyword(
  text: string,
  keywords: ReadonlyArray<string>
): string | null {
  const lower = text.toLowerCase();
  for (const keyword of keywords) {
    const pattern = new RegExp(`\\b${keyword}\\b`);
    if (pattern.test(lower)) return keyword;
  }
  return null;
}

describe('getStartOfWeek', () => {
  it('returns the prior Sunday at 00:00 for a mid-week date', () => {
    // 2026-05-13 is a Wednesday.
    const wed = new Date(2026, 4, 13, 14, 30);
    const sunday = getStartOfWeek(wed);
    expect(sunday.getDay()).toBe(0);
    expect(sunday.getDate()).toBe(10);
    expect(sunday.getHours()).toBe(0);
    expect(sunday.getMinutes()).toBe(0);
  });

  it('returns the same Sunday when called on a Sunday', () => {
    const sun = new Date(2026, 4, 10, 9, 0);
    const result = getStartOfWeek(sun);
    expect(result.getDate()).toBe(10);
    expect(result.getHours()).toBe(0);
  });
});

describe('getDayMealPlan — schedule', () => {
  const week = (offset: number) => new Date(2026, 4, 10 + offset);

  it('every day returns all four meal categories', () => {
    for (let offset = 0; offset < 7; offset++) {
      const plan = getDayMealPlan(week(offset));
      for (const category of MEAL_CATEGORIES) {
        expect(plan.meals[category]).toBeDefined();
        expect(plan.meals[category].name.trim()).not.toBe('');
      }
    }
  });

  it('every category draws from both plant and animal pools', () => {
    for (const [index, category] of MEAL_CATEGORIES.entries()) {
      const combined = poolFor(category);
      for (const meal of PLANT_POOLS[index]) expect(combined).toContain(meal);
      for (const meal of ANIMAL_POOLS[index]) expect(combined).toContain(meal);
    }
  });
});

describe('getDayMealPlan — determinism + variety', () => {
  it('the same date returns the same plan across calls', () => {
    const a = getDayMealPlan(new Date(2026, 4, 11));
    const b = getDayMealPlan(new Date(2026, 4, 11));
    for (const category of MEAL_CATEGORIES) {
      expect(a.meals[category].name).toBe(b.meals[category].name);
    }
  });

  it('different times of day within the same date give the same plan', () => {
    const morning = getDayMealPlan(new Date(2026, 4, 11, 7, 0));
    const evening = getDayMealPlan(new Date(2026, 4, 11, 21, 30));
    for (const category of MEAL_CATEGORIES) {
      expect(morning.meals[category].name).toBe(evening.meals[category].name);
    }
  });

  it('different days within the same week produce some variety in breakfasts', () => {
    const breakfasts = [0, 1, 2, 3, 4, 5, 6].map(
      offset => getDayMealPlan(new Date(2026, 4, 10 + offset)).meals.breakfast.name
    );
    expect(new Set(breakfasts).size).toBeGreaterThan(1);
  });

  it('different weeks produce a different breakfast for the same weekday', () => {
    const monday = (weekOffset: number) =>
      getDayMealPlan(new Date(2026, 4, 11 + weekOffset * 7)).meals.breakfast.name;
    const names = [monday(0), monday(1), monday(2), monday(3)];
    expect(new Set(names).size).toBeGreaterThan(1);
  });
});

describe('meal pool integrity', () => {
  it('every plant pool has at least 6 entries', () => {
    for (const pool of PLANT_POOLS) {
      expect(pool.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('every animal-protein pool has at least one entry', () => {
    for (const pool of ANIMAL_POOLS) {
      expect(pool.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every meal has a non-empty name', () => {
    for (const pool of ALL_POOLS) {
      for (const meal of pool) {
        expect(meal.name.trim()).not.toBe('');
      }
    }
  });

  it('every meal names protein first and fibre second', () => {
    for (const pool of ALL_POOLS) {
      for (const meal of pool) {
        expect(meal.components.protein.trim()).not.toBe('');
        expect(meal.components.fibre.trim()).not.toBe('');
        if (meal.components.carb !== undefined) {
          expect(meal.components.carb.trim()).not.toBe('');
        }
      }
    }
  });

  it('no duplicate meal names within a category', () => {
    for (const category of MEAL_CATEGORIES) {
      const names = poolFor(category).map(meal => meal.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('plant pools contain no animal proteins', () => {
    for (const pool of PLANT_POOLS) {
      for (const meal of pool) {
        const haystack =
          meal.name + ' ' + Object.values(meal.components).join(' ');
        const hit = containsKeyword(haystack, ANIMAL_KEYWORDS);
        expect(
          hit,
          `Plant pool entry "${meal.name}" contained "${hit}"`
        ).toBeNull();
      }
    }
  });

  it('contains both Greek and Indian inspiration', () => {
    const names = ALL_POOLS.flat().map(meal => meal.name).join(' ');
    expect(names).toMatch(/Greek|pita|lamb|olive oil/i);
    expect(names).toMatch(/paneer|dal|roti|chana|tikka/i);
  });

  it('contains no beef or veal', () => {
    for (const pool of ALL_POOLS) {
      for (const meal of pool) {
        const haystack =
          meal.name + ' ' + Object.values(meal.components).join(' ');
        expect(containsKeyword(haystack, BEEF_KEYWORDS)).toBeNull();
      }
    }
  });
});

describe('food shelf', () => {
  it('keeps the approved category order', () => {
    expect(FOOD_SHELF.map(category => category.label)).toEqual([
      'Protein',
      'Vegetables / fibre',
      'Fat',
      'Carb',
      'Fruit — earlier',
    ]);
  });

  it('has useful choices and no beef or veal', () => {
    for (const category of FOOD_SHELF) {
      expect(category.foods.length).toBeGreaterThanOrEqual(5);
      for (const food of category.foods) {
        expect(food.trim()).not.toBe('');
        expect(containsKeyword(food, BEEF_KEYWORDS)).toBeNull();
      }
    }
  });
});

describe('djb2 + pickOne', () => {
  it('djb2 is deterministic and discriminating', () => {
    expect(djb2('food-2026-05-10|1|breakfast')).toBe(
      djb2('food-2026-05-10|1|breakfast')
    );
    expect(djb2('a')).not.toBe(djb2('b'));
  });

  it('pickOne returns a meal from the pool', () => {
    const picked = pickOne(BREAKFAST_PLANT, 12345);
    expect(BREAKFAST_PLANT).toContain(picked);
  });

  it('pickOne is a deterministic function of (seed, pool)', () => {
    const a = pickOne(LUNCH_PLANT, 999);
    const b = pickOne(LUNCH_PLANT, 999);
    expect(a.name).toBe(b.name);
  });

  it('pickOne returns a placeholder for an empty pool rather than throwing', () => {
    const fallback = pickOne([], 1) as Meal;
    expect(fallback.name).toBe('—');
  });
});

describe('meal category exports', () => {
  it('MEAL_CATEGORIES is the canonical four-slot list', () => {
    const expected: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    expect([...MEAL_CATEGORIES]).toEqual(expected);
  });
});
