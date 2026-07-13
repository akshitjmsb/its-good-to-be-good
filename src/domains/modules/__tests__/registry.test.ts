import { describe, expect, it } from 'vitest';
import {
  MODULE_REGISTRY,
  getModuleById,
  getModulesByCategory,
} from '../registry';

const EXPECTED_TOOL_IDS = ['todo', 'khyaali-bhoot', 'tennis', 'food'];

describe('module registry', () => {
  it('has unique module ids', () => {
    const ids = MODULE_REGISTRY.map(module => module.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('returns the exact purpose-tool set', () => {
    const journeyIds = getModulesByCategory('journey').map(module => module.id);
    expect(journeyIds.sort()).toEqual([...EXPECTED_TOOL_IDS].sort());
  });

  it('contains complete metadata for every module', () => {
    MODULE_REGISTRY.forEach(module => {
      expect(module.displayName.trim().length).toBeGreaterThan(0);
      expect(module.entrySelector.trim().length).toBeGreaterThan(0);
      expect(module.handlerName.trim().length).toBeGreaterThan(0);
      expect(module.ownerPath.trim().length).toBeGreaterThan(0);
      expect(module.category).toBe('journey');
      expect(module.surface).toBe('page');
    });
  });

  it('gives every tool a page of its own (square tools always navigate)', () => {
    MODULE_REGISTRY.forEach(module => {
      expect(module.routeHref).toMatch(/\.html$/);
    });
    expect(getModuleById('food')?.routeHref).toBe('food.html');
  });
});
