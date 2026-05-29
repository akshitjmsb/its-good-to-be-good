import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Recorder = {
  table?: string;
  inserted?: unknown;
  upserted?: unknown;
  deletedFor?: string;
  deletedIds?: string[];
  insertError?: { message: string } | null;
  deleteError?: { message: string } | null;
  upsertError?: { message: string } | null;
  selectError?: { message: string } | null;
  /** Rows the mock DB pretends exist (for select queries). */
  serverRows?: Array<Record<string, unknown>>;
};

const recorder: Recorder = {};

function buildSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      recorder.table = table;
      return {
        delete: () => ({
          eq: vi.fn(async (_col: string, value: string) => {
            recorder.deletedFor = value;
            return { error: recorder.deleteError ?? null };
          }),
          in: vi.fn(async (_col: string, ids: string[]) => {
            recorder.deletedIds = ids;
            return { error: recorder.deleteError ?? null };
          }),
        }),
        insert: vi.fn(async (rows: unknown) => {
          recorder.inserted = rows;
          return { error: recorder.insertError ?? null };
        }),
        upsert: vi.fn(async (rows: unknown) => {
          recorder.upserted = rows;
          return { error: recorder.upsertError ?? null };
        }),
        // Awaitable query builder: `.select().eq()` (delete-stale) resolves
        // directly, while `.select().eq().order()` (loadTasks) also works.
        select: vi.fn(() => {
          const result = {
            data: recorder.serverRows ?? [],
            error: recorder.selectError ?? null,
          };
          const builder = {
            eq: vi.fn(() => builder),
            order: vi.fn(() => Promise.resolve(result)),
            then: (onFulfilled: (r: typeof result) => unknown) =>
              Promise.resolve(result).then(onFulfilled),
          };
          return builder;
        }),
      };
    }),
  };
}

vi.mock('../../../lib/supabase', () => ({
  supabase: buildSupabaseMock(),
}));

import {
  recordPoetrySelection,
  replaceAllForUser,
  saveTasks,
} from '../persistence';

beforeEach(() => {
  recorder.table = undefined;
  recorder.inserted = undefined;
  recorder.upserted = undefined;
  recorder.deletedFor = undefined;
  recorder.deletedIds = undefined;
  recorder.insertError = null;
  recorder.deleteError = null;
  recorder.upsertError = null;
  recorder.selectError = null;
  recorder.serverRows = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('replaceAllForUser', () => {
  it('deletes the user rows and inserts the new payload', async () => {
    await replaceAllForUser('tasks', 'user-1', [
      { user_id: 'user-1', text: 'a' },
    ]);
    expect(recorder.table).toBe('tasks');
    expect(recorder.deletedFor).toBe('user-1');
    expect(recorder.inserted).toEqual([{ user_id: 'user-1', text: 'a' }]);
  });

  it('skips the insert when rows is empty (delete-only)', async () => {
    await replaceAllForUser('tasks', 'user-2', []);
    expect(recorder.deletedFor).toBe('user-2');
    expect(recorder.inserted).toBeUndefined();
  });

  it('throws when the insert returns an error', async () => {
    recorder.insertError = { message: 'boom' };
    await expect(
      replaceAllForUser('tasks', 'user-3', [{ user_id: 'user-3' }])
    ).rejects.toEqual({ message: 'boom' });
  });
});

describe('saveTasks', () => {
  it('upserts every task keyed on id — new and existing alike use one path', async () => {
    await saveTasks(
      'u',
      [
        { id: 'id-1', text: 'one', completed: false, position: 0, parent_id: null },
        { id: 'id-2', text: 'two', completed: true, position: 1, parent_id: null },
      ],
      { loadedSuccessfully: true }
    );
    expect(recorder.upserted).toEqual([
      { id: 'id-1', user_id: 'u', text: 'one', completed: false, position: 0, parent_id: null },
      { id: 'id-2', user_id: 'u', text: 'two', completed: true, position: 1, parent_id: null },
    ]);
    // Single upsert path — the legacy insert branch is gone.
    expect(recorder.inserted).toBeUndefined();
  });

  it('carries parent_id through for subtasks', async () => {
    await saveTasks(
      'u',
      [
        { id: 'parent', text: 'p', completed: false, position: 0, parent_id: null },
        { id: 'child', text: 'c', completed: false, position: 0, parent_id: 'parent' },
      ],
      { loadedSuccessfully: true }
    );
    expect(recorder.upserted).toEqual([
      { id: 'parent', user_id: 'u', text: 'p', completed: false, position: 0, parent_id: null },
      { id: 'child', user_id: 'u', text: 'c', completed: false, position: 0, parent_id: 'parent' },
    ]);
  });

  it('deletes server rows that are absent from the local list', async () => {
    recorder.serverRows = [{ id: 'keep' }, { id: 'gone-1' }, { id: 'gone-2' }];
    await saveTasks(
      'u',
      [{ id: 'keep', text: 'keep', completed: false, position: 0, parent_id: null }],
      { loadedSuccessfully: true }
    );
    expect(recorder.deletedIds).toEqual(['gone-1', 'gone-2']);
  });

  it('does not delete anything when the server matches the local list', async () => {
    recorder.serverRows = [{ id: 'a' }, { id: 'b' }];
    await saveTasks(
      'u',
      [
        { id: 'a', text: 'a', completed: false, position: 0, parent_id: null },
        { id: 'b', text: 'b', completed: false, position: 1, parent_id: null },
      ],
      { loadedSuccessfully: true }
    );
    expect(recorder.deletedIds).toBeUndefined();
  });

  it('throws when the upsert returns an error', async () => {
    recorder.upsertError = { message: 'boom' };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      saveTasks(
        'u',
        [{ id: 'x', text: 'x', completed: false, position: 0, parent_id: null }],
        { loadedSuccessfully: true }
      )
    ).rejects.toEqual({ message: 'boom' });
    spy.mockRestore();
  });

  it('skips save when tasks are empty and load was NOT confirmed', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await saveTasks('u', []);
    // Should not have touched the DB at all
    expect(recorder.upserted).toBeUndefined();
    expect(recorder.inserted).toBeUndefined();
    expect(recorder.deletedFor).toBeUndefined();
    expect(recorder.deletedIds).toBeUndefined();
    spy.mockRestore();
  });

  it('clears every server row when saving an empty list with a confirmed load', async () => {
    recorder.serverRows = [{ id: 'a' }, { id: 'b' }];
    await saveTasks('u', [], { loadedSuccessfully: true });
    // No upsert (nothing to write) but the stale rows are swept.
    expect(recorder.upserted).toBeUndefined();
    expect(recorder.deletedIds).toEqual(['a', 'b']);
  });
});

describe('recordPoetrySelection (pure)', () => {
  it('prepends a new selection with a timestamp', () => {
    const result = recordPoetrySelection([], 'Rumi', 'Persian');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ poet: 'Rumi', language: 'Persian' });
    expect(typeof result[0].timestamp).toBe('number');
  });

  it('deduplicates back-to-back identical selections', () => {
    const first = recordPoetrySelection([], 'Ghalib', 'Urdu');
    const second = recordPoetrySelection(first, 'Ghalib', 'Urdu');
    expect(second).toHaveLength(1);
  });

  it('caps history at MAX_POETRY_RECENTS (6)', () => {
    let recents: ReturnType<typeof recordPoetrySelection> = [];
    for (let i = 0; i < 10; i++) {
      recents = recordPoetrySelection(recents, `poet-${i}`, 'English');
    }
    expect(recents.length).toBeLessThanOrEqual(6);
  });
});
