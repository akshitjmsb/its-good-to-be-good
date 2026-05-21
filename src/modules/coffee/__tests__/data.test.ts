import { describe, expect, it } from 'vitest';
import {
  __INTERNAL,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type Recipe,
  type RecipeCategory,
  getMenu,
  getMenuByCategory,
  getTodaysDrink,
} from '../data';

const { djb2, RECIPES } = __INTERNAL;

describe('coffee pool integrity', () => {
  it('has at least 25 recipes', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(25);
  });

  it('every recipe has all required fields populated', () => {
    for (const r of RECIPES) {
      expect(r.name.trim()).not.toBe('');
      expect(CATEGORY_ORDER).toContain(r.category);
      expect(['easy', 'medium', 'advanced']).toContain(r.difficulty);
      expect(r.brewTime.trim()).not.toBe('');
      expect(r.tip.trim().length).toBeGreaterThan(15);
      expect(r.origin.trim().length).toBeGreaterThan(15);
      expect(r.ingredients.length).toBeGreaterThan(0);
      expect(r.instructions.length).toBeGreaterThan(0);
      for (const i of r.ingredients) {
        expect(i.item.trim()).not.toBe('');
        expect(i.amount.trim()).not.toBe('');
      }
      for (const step of r.instructions) {
        expect(step.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('no duplicate names', () => {
    const names = RECIPES.map(r => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every category has at least 3 recipes', () => {
    for (const category of CATEGORY_ORDER) {
      const count = RECIPES.filter(r => r.category === category).length;
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  it('every difficulty level appears at least once', () => {
    const difficulties = new Set(RECIPES.map(r => r.difficulty));
    expect(difficulties.has('easy')).toBe(true);
    expect(difficulties.has('medium')).toBe(true);
    expect(difficulties.has('advanced')).toBe(true);
  });

  it('CATEGORY_LABELS covers every category in CATEGORY_ORDER', () => {
    for (const category of CATEGORY_ORDER) {
      expect(typeof CATEGORY_LABELS[category]).toBe('string');
      expect(CATEGORY_LABELS[category].length).toBeGreaterThan(0);
    }
  });
});

describe('getTodaysDrink', () => {
  it('returns the same drink for the same date across calls', () => {
    const a = getTodaysDrink(new Date(2026, 4, 13));
    const b = getTodaysDrink(new Date(2026, 4, 13));
    expect(a.name).toBe(b.name);
  });

  it('returns the same drink for different times of the same day', () => {
    const morning = getTodaysDrink(new Date(2026, 4, 13, 7, 0));
    const evening = getTodaysDrink(new Date(2026, 4, 13, 22, 0));
    expect(morning.name).toBe(evening.name);
  });

  it('different dates produce a varied selection over a 7-day window', () => {
    const names = new Set<string>();
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(2026, 4, 10 + offset);
      names.add(getTodaysDrink(date).name);
    }
    // Strict requirement: not all 7 the same.
    expect(names.size).toBeGreaterThan(1);
  });

  it('each picked drink is a valid Recipe from the pool', () => {
    const picked = getTodaysDrink(new Date(2026, 4, 13));
    expect(RECIPES.some(r => r.name === picked.name)).toBe(true);
  });
});

describe('getMenu / getMenuByCategory', () => {
  it('getMenu returns the full pool', () => {
    expect(getMenu().length).toBe(RECIPES.length);
  });

  it('getMenuByCategory groups by category in CATEGORY_ORDER', () => {
    const grouped = getMenuByCategory();
    expect(grouped.map(g => g.category)).toEqual([...CATEGORY_ORDER]);
    const total = grouped.reduce((sum, g) => sum + g.recipes.length, 0);
    expect(total).toBe(RECIPES.length);
  });

  it('every grouped recipe lives in the right category bucket', () => {
    const grouped = getMenuByCategory();
    for (const { category, recipes } of grouped) {
      for (const r of recipes) {
        expect(r.category).toBe(category);
      }
    }
  });
});

describe('djb2', () => {
  it('is deterministic', () => {
    expect(djb2('coffee-2026-05-13')).toBe(djb2('coffee-2026-05-13'));
  });

  it('different inputs produce different hashes', () => {
    expect(djb2('a')).not.toBe(djb2('b'));
  });
});

// Belt-and-braces: ensure category labels we expose match what the
// module's RecipeCategory type allows.
describe('category labels', () => {
  it('labels object key set equals CATEGORY_ORDER set', () => {
    const labelKeys = Object.keys(CATEGORY_LABELS) as RecipeCategory[];
    expect(new Set(labelKeys)).toEqual(new Set(CATEGORY_ORDER));
  });
});

// Type-only sanity check using the Recipe interface — caught by tsc, not vitest.
const _typeCheck: Recipe = RECIPES[0];
void _typeCheck;
