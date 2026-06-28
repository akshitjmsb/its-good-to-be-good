import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { query, mutation } = vi.hoisted(() => ({
  query: vi.fn(),
  mutation: vi.fn(),
}));

vi.mock('../../../lib/convex', () => ({
  convex: { query, mutation },
}));

vi.mock('../../../../convex/_generated/api', () => ({
  api: {
    userModules: {
      listCustom: 'userModules.listCustom',
      listOverrides: 'userModules.listOverrides',
      listArchived: 'userModules.listArchived',
      upsertModule: 'userModules.upsertModule',
      deleteModule: 'userModules.deleteModule',
      saveOverride: 'userModules.saveOverride',
      setArchived: 'userModules.setArchived',
      bulkUpsert: 'userModules.bulkUpsert',
    },
  },
}));

import {
  saveCustomModuleToConvex,
  deleteCustomModuleFromConvex,
  saveOverrideToConvex,
  loadCustomModulesFromConvex,
  migrateLocalStorageToConvex,
} from '../module-persistence';

beforeEach(() => {
  query.mockReset();
  mutation.mockReset();
  mutation.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('saveCustomModuleToConvex', () => {
  it('upserts a custom module row', async () => {
    await saveCustomModuleToConvex('u1', {
      id: 'custom-abc',
      name: 'Khyaali Bhoot',
      emoji: '🌱',
      category: 'journey',
      createdAt: 1700000000000,
    });
    expect(mutation).toHaveBeenCalledWith('userModules.upsertModule', {
      moduleId: 'custom-abc',
      displayName: 'Khyaali Bhoot',
      emoji: '🌱',
      category: 'journey',
      isCustom: true,
      position: 0,
      createdAt: new Date(1700000000000).toISOString(),
    });
  });
});

describe('deleteCustomModuleFromConvex', () => {
  it('deletes by moduleId', async () => {
    await deleteCustomModuleFromConvex('u1', 'custom-abc');
    expect(mutation).toHaveBeenCalledWith('userModules.deleteModule', {
      moduleId: 'custom-abc',
    });
  });
});

describe('saveOverrideToConvex', () => {
  it('upserts an override row', async () => {
    await saveOverrideToConvex('u1', 'coffee', {
      displayName: 'Chai',
      emoji: '☕',
    });
    expect(mutation).toHaveBeenCalledWith('userModules.saveOverride', {
      moduleId: 'coffee',
      displayName: 'Chai',
      emoji: '☕',
    });
  });

  it('passes empty fields through so the server removes the override', async () => {
    await saveOverrideToConvex('u1', 'coffee', {});
    expect(mutation).toHaveBeenCalledWith('userModules.saveOverride', {
      moduleId: 'coffee',
      displayName: '',
      emoji: '',
    });
  });
});

describe('loadCustomModulesFromConvex', () => {
  it('maps rows to CustomModule and returns null on error', async () => {
    query.mockResolvedValueOnce([
      {
        moduleId: 'custom-1',
        displayName: 'Garden',
        emoji: '🌿',
        category: 'learn',
        createdAt: new Date(1700000000000).toISOString(),
      },
    ]);
    expect(await loadCustomModulesFromConvex('u1')).toEqual([
      {
        id: 'custom-1',
        name: 'Garden',
        emoji: '🌿',
        category: 'learn',
        createdAt: 1700000000000,
      },
    ]);

    query.mockRejectedValueOnce(new Error('offline'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadCustomModulesFromConvex('u1')).toBeNull();
    spy.mockRestore();
  });
});

describe('migrateLocalStorageToConvex', () => {
  it('bulk-upserts custom modules and overrides in one call', async () => {
    await migrateLocalStorageToConvex(
      'u1',
      [
        {
          id: 'custom-xyz',
          name: 'Garden',
          emoji: '🌿',
          category: 'learn',
          createdAt: 1700000000000,
        },
      ],
      { todo: { displayName: 'Tasks' } }
    );
    expect(mutation).toHaveBeenCalledTimes(1);
    const [fn, payload] = mutation.mock.calls[0] as [string, { rows: Array<Record<string, unknown>> }];
    expect(fn).toBe('userModules.bulkUpsert');
    expect(payload.rows).toHaveLength(2);
    expect(payload.rows[0].moduleId).toBe('custom-xyz');
    expect(payload.rows[0].isCustom).toBe(true);
    expect(payload.rows[1].moduleId).toBe('todo');
    expect(payload.rows[1].isCustom).toBe(false);
  });

  it('skips when nothing to migrate', async () => {
    await migrateLocalStorageToConvex('u1', [], {});
    expect(mutation).not.toHaveBeenCalled();
  });
});
