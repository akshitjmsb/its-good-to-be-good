import { describe, expect, it } from 'vitest';
import {
  __INTERNAL,
  getDayMealPlan,
  getStartOfWeek,
  isVegDay,
  MEAL_CATEGORIES,
  type Meal,
  type MealCategory,
} from '../data';

const {
  djb2,
  pickOne,
  BREAKFAST_VEG,
  BREAKFAST_NONVEG,
  LUNCH_VEG,
  LUNCH_NONVEG,
  DINNER_VEG,
  DINNER_NONVEG,
  SNACK_VEG,
  SNACK_NONVEG,
} = __INTERNAL;

const VEG_POOLS: ReadonlyArray<ReadonlyArray<Meal>> = [
  BREAKFAST_VEG,
  LUNCH_VEG,
  DINNER_VEG,
  SNACK_VEG,
];

const NONVEG_POOLS: ReadonlyArray<ReadonlyArray<Meal>> = [
  BREAKFAST_NONVEG,
  LUNCH_NONVEG,
  DINNER_NONVEG,
  SNACK_NONVEG,
];

const ALL_POOLS: ReadonlyArray<ReadonlyArray<Meal>> = [
  ...VEG_POOLS,
  ...NONVEG_POOLS,
];

const MEAT_KEYWORDS = [
  'chicken',
  'beef',
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

// Use word boundaries so "egg" doesn't match "eggplant" and "fish" doesn't
// match e.g. "fishcake" if a future meal happens to use that compound.
function containsMeatKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  for (const keyword of MEAT_KEYWORDS) {
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

describe('isVegDay', () => {
  it.each([
    [0, false], // Sunday
    [1, false], // Monday
    [2, true],  // Tuesday
    [3, false], // Wednesday
    [4, true],  // Thursday
    [5, false], // Friday
    [6, false], // Saturday
  ])('day-of-week %s -> vegetarian: %s', (offset, expected) => {
    const date = new Date(2026, 4, 10 + offset);
    expect(isVegDay(date)).toBe(expected);
  });
});

describe('getDayMealPlan — schedule', () => {
  const week = (offset: number) => new Date(2026, 4, 10 + offset);

  it.each([2, 4] as const)('day offset %s is vegetarian', offset => {
    const plan = getDayMealPlan(week(offset));
    expect(plan.vegetarian).toBe(true);
  });

  it.each([0, 1, 3, 5, 6] as const)('day offset %s is regular', offset => {
    const plan = getDayMealPlan(week(offset));
    expect(plan.vegetarian).toBe(false);
  });

  it('every day returns all four meal categories', () => {
    for (let offset = 0; offset < 7; offset++) {
      const plan = getDayMealPlan(week(offset));
      for (const category of MEAL_CATEGORIES) {
        expect(plan.meals[category]).toBeDefined();
        expect(plan.meals[category].name.trim()).not.toBe('');
      }
    }
  });

  it('on vegetarian days, no meal contains meat or fish or egg names', () => {
    for (const offset of [2, 4]) {
      const plan = getDayMealPlan(week(offset));
      for (const category of MEAL_CATEGORIES) {
        const meal = plan.meals[category];
        const haystack =
          meal.name + ' ' + Object.values(meal.components).join(' ');
        const hit = containsMeatKeyword(haystack);
        expect(
          hit,
          `${category} on day offset ${offset} contained "${hit}": ${meal.name}`
        ).toBeNull();
      }
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
    const breakfasts = [0, 1, 3, 5, 6].map(
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
  it('every vegetarian pool has at least 6 entries', () => {
    for (const pool of VEG_POOLS) {
      expect(pool.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('every non-vegetarian pool has at least one entry', () => {
    for (const pool of NONVEG_POOLS) {
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

  it('no duplicate meal names within a single category-vegetarian pool', () => {
    for (const pool of ALL_POOLS) {
      const names = pool.map(m => m.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('no vegetarian-pool meal contains meat/fish/egg keywords', () => {
    for (const pool of VEG_POOLS) {
      for (const meal of pool) {
        const haystack =
          meal.name + ' ' + Object.values(meal.components).join(' ');
        const hit = containsMeatKeyword(haystack);
        expect(hit, `Veg pool entry "${meal.name}" contained "${hit}"`).toBeNull();
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
    const picked = pickOne(BREAKFAST_VEG, 12345);
    expect(BREAKFAST_VEG).toContain(picked);
  });

  it('pickOne is a deterministic function of (seed, pool)', () => {
    const a = pickOne(LUNCH_VEG, 999);
    const b = pickOne(LUNCH_VEG, 999);
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
