import { describe, expect, it } from 'vitest';
import { __INTERNAL as DATA_INTERNAL } from '../data';
import {
  __INTERNAL as ICONS_INTERNAL,
  getCoffeeIcon,
} from '../icons';

const { RECIPES } = DATA_INTERNAL;
const { COFFEE_ICONS } = ICONS_INTERNAL;

describe('coffee icons', () => {
  it('every recipe in the pool has a dedicated icon entry', () => {
    for (const recipe of RECIPES) {
      expect(COFFEE_ICONS[recipe.name]).toBeDefined();
    }
  });

  it('every icon is a non-empty <svg> element string', () => {
    for (const [name, icon] of Object.entries(COFFEE_ICONS)) {
      expect(icon, name).toMatch(/^<svg[^>]*viewBox=/);
      expect(icon, name).toMatch(/<\/svg>$/);
    }
  });

  it('every icon uses currentColor for the stroke (so CSS color cascades)', () => {
    for (const [name, icon] of Object.entries(COFFEE_ICONS)) {
      expect(icon, name).toContain('stroke="currentColor"');
    }
  });

  it('every icon is decorative (aria-hidden="true")', () => {
    for (const [name, icon] of Object.entries(COFFEE_ICONS)) {
      expect(icon, name).toContain('aria-hidden="true"');
    }
  });

  it('getCoffeeIcon returns a real SVG for a known drink and falls back for unknown', () => {
    const known = getCoffeeIcon('Cappuccino');
    expect(known).toMatch(/^<svg/);
    const unknown = getCoffeeIcon('Hypothetical Frappuccino XL');
    expect(unknown).toMatch(/^<svg/); // falls back to Espresso
  });
});
