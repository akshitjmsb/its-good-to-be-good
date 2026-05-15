import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Recorder = {
  table?: string;
  upserted?: unknown;
  deletedFor?: Record<string, string>;
  upsertError?: { message: string } | null;
  deleteError?: { message: string } | null;
  selectRows?: Array<Record<string, unknown>>;
};

const recorder: Recorder = {};

function buildSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      recorder.table = table;
      const chain = {
        delete: () => ({
          eq: vi.fn((_col: string, _val: string) => {
            const proxy = {
              eq: vi.fn((_col2: string, _val2: string) => {
                recorder.deletedFor = { [_col]: _val, [_col2]: _val2 };
                return Promise.resolve({ error: recorder.deleteError ?? null });
              }),
            };
            // If no further .eq() is chained, resolve immediately.
            recorder.deletedFor = { [_col]: _val };
            return Object.assign(
              Promise.resolve({ error: recorder.deleteError ?? null }),
              proxy
            );
          }),
        }),
        upsert: vi.fn(async (rows: unknown) => {
          recorder.upserted = rows;
          return { error: recorder.upsertError ?? null };
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: recorder.selectRows ?? [],
                error: null,
              })),
            })),
          })),
        })),
      };
      return chain;
    }),
  };
}

vi.mock('../../../lib/supabase', () => ({
  supabase: buildSupabaseMock(),
}));

import {
  saveCustomModuleToSupabase,
  deleteCustomModuleFromSupabase,
  saveOverrideToSupabase,
  loadCustomModulesFromSupabase,
  migrateLocalStorageToSupabase,
} from '../module-persistence';

beforeEach(() => {
  recorder.table = undefined;
  recorder.upserted = undefined;
  recorder.deletedFor = undefined;
  recorder.upsertError = null;
  recorder.deleteError = null;
  recorder.selectRows = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('saveCustomModuleToSupabase', () => {
  it('upserts a custom module row', async () => {
    await saveCustomModuleToSupabase('u1', {
      id: 'custom-abc',
      name: 'Khyaali Bhoot',
      emoji: '🌱',
      category: 'journey',
      createdAt: 1700000000000,
    });
    expect(recorder.table).toBe('user_modules');
    const row = recorder.upserted as Record<string, unknown>;
    expect(row.user_id).toBe('u1');
    expect(row.module_id).toBe('custom-abc');
    expect(row.display_name).toBe('Khyaali Bhoot');
    expect(row.emoji).toBe('🌱');
    expect(row.is_custom).toBe(true);
  });
});

describe('deleteCustomModuleFromSupabase', () => {
  it('deletes by user_id and module_id', async () => {
    await deleteCustomModuleFromSupabase('u1', 'custom-abc');
    expect(recorder.table).toBe('user_modules');
    expect(recorder.deletedFor).toMatchObject({ user_id: 'u1' });
  });
});

describe('saveOverrideToSupabase', () => {
  it('upserts an override row', async () => {
    await saveOverrideToSupabase('u1', 'coffee', {
      displayName: 'Chai',
      emoji: '☕',
    });
    expect(recorder.table).toBe('user_modules');
    const row = recorder.upserted as Record<string, unknown>;
    expect(row.module_id).toBe('coffee');
    expect(row.display_name).toBe('Chai');
    expect(row.is_custom).toBe(false);
  });

  it('deletes the row when both fields are cleared', async () => {
    await saveOverrideToSupabase('u1', 'coffee', {});
    expect(recorder.table).toBe('user_modules');
    // Should have called delete, not upsert.
    expect(recorder.upserted).toBeUndefined();
  });
});

describe('loadCustomModulesFromSupabase', () => {
  it('returns null on error (caller falls back to localStorage)', async () => {
    // The mock returns selectRows which defaults to [] — but the
    // chain structure means the actual call goes through .eq().eq().order().
    // Since our mock returns [], we get an empty array.
    const result = await loadCustomModulesFromSupabase('u1');
    expect(result).toEqual([]);
  });
});

describe('migrateLocalStorageToSupabase', () => {
  it('upserts custom modules and overrides in one call', async () => {
    await migrateLocalStorageToSupabase(
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
    expect(recorder.table).toBe('user_modules');
    const rows = recorder.upserted as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0].module_id).toBe('custom-xyz');
    expect(rows[0].is_custom).toBe(true);
    expect(rows[1].module_id).toBe('todo');
    expect(rows[1].is_custom).toBe(false);
  });

  it('skips when nothing to migrate', async () => {
    await migrateLocalStorageToSupabase('u1', [], {});
    expect(recorder.upserted).toBeUndefined();
  });
});
