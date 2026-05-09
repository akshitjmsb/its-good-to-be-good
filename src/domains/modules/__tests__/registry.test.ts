import { describe, expect, it } from 'vitest';
import {
  MODULE_REGISTRY,
  getModuleById,
  getModulesByCategory,
} from '../registry';

const EXPECTED_JOURNEY_IDS = [
  'todo',
  'quantum',
  'meditate',
  'money',
  'health',
  'travel',
  'tennis',
];

const EXPECTED_LEARN_IDS = [
  'world-order',
  'coffee',
  'guitar',
  'poetry',
  'french',
  'food',
  'analytics',
  'curious',
  'exercise',
];

describe('module registry', () => {
  it('has unique module ids', () => {
    const ids = MODULE_REGISTRY.map(module => module.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('returns exact journey and learn module sets', () => {
    const journeyIds = getModulesByCategory('journey').map(module => module.id);
    const learnIds = getModulesByCategory('learn').map(module => module.id);

    expect(journeyIds.sort()).toEqual(EXPECTED_JOURNEY_IDS.sort());
    expect(learnIds.sort()).toEqual(EXPECTED_LEARN_IDS.sort());
  });

  it('contains complete metadata for every module', () => {
    MODULE_REGISTRY.forEach(module => {
      expect(module.displayName.trim().length).toBeGreaterThan(0);
      expect(module.entrySelector.trim().length).toBeGreaterThan(0);
      expect(module.handlerName.trim().length).toBeGreaterThan(0);
      expect(module.ownerPath.trim().length).toBeGreaterThan(0);
      expect(['journey', 'learn']).toContain(module.category);
      expect(['page', 'modal']).toContain(module.surface);
    });
  });

  it('keeps French as a Learn module with page surface', () => {
    const french = getModuleById('french');
    expect(french).toBeDefined();
    expect(french?.category).toBe('learn');
    expect(french?.surface).toBe('page');
    expect(french?.routeHref).toBe('french.html');
  });
});
