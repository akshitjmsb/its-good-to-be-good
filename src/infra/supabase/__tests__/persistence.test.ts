import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Recorder = {
  table?: string;
  inserted?: unknown;
  deletedFor?: string;
  insertError?: { message: string } | null;
  deleteError?: { message: string } | null;
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
        }),
        insert: vi.fn(async (rows: unknown) => {
          recorder.inserted = rows;
          return { error: recorder.insertError ?? null };
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
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
  recorder.deletedFor = undefined;
  recorder.insertError = null;
  recorder.deleteError = null;
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
  it('shapes tasks into rows with user_id and persists them', async () => {
    await saveTasks('u', [
      { text: 'one', completed: false, position: 0, parent_id: null },
      { text: 'two', completed: true, position: 1, parent_id: null },
    ]);
    expect(recorder.inserted).toEqual([
      { user_id: 'u', text: 'one', completed: false, position: 0, parent_id: null },
      { user_id: 'u', text: 'two', completed: true, position: 1, parent_id: null },
    ]);
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
