import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Convex client + generated api so the wrappers run against spies.
const { query, mutation } = vi.hoisted(() => ({
  query: vi.fn(),
  mutation: vi.fn(),
}));

vi.mock('./client', () => ({
  convex: { query, mutation },
}));

vi.mock('../../../convex/_generated/api', () => ({
  api: {
    tasks: { list: 'tasks.list', save: 'tasks.save' },
  },
}));

import { loadTasks, saveTasks } from './persistence';

beforeEach(() => {
  query.mockReset();
  mutation.mockReset();
  mutation.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('loadTasks', () => {
  it('maps Convex rows (camelCase) to the Task shape (snake_case)', async () => {
    query.mockResolvedValue([
      {
        id: 'a',
        text: 'a',
        completed: false,
        position: 0,
        parentId: 'p',
        updatedAt: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const tasks = await loadTasks('u');
    expect(query).toHaveBeenCalledWith('tasks.list', {});
    expect(tasks).toEqual([
      {
        id: 'a',
        text: 'a',
        completed: false,
        position: 0,
        parent_id: 'p',
        updated_at: '2026-01-01T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('rethrows a real load failure (must not masquerade as "no tasks")', async () => {
    query.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(loadTasks('u')).rejects.toThrow('boom');
    spy.mockRestore();
  });
});

describe('saveTasks', () => {
  it('upserts every task keyed on clientId, carrying parentId/updatedAt/createdAt', async () => {
    await saveTasks('u', [
      {
        id: 'id-1',
        text: 'one',
        completed: false,
        position: 0,
        parent_id: null,
        updated_at: '2026-01-01T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'child',
        text: 'c',
        completed: false,
        position: 0,
        parent_id: 'id-1',
        updated_at: '2026-01-02T00:00:00.000Z',
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ]);
    expect(mutation).toHaveBeenCalledWith('tasks.save', {
      tasks: [
        {
          clientId: 'id-1',
          text: 'one',
          completed: false,
          position: 0,
          parentId: null,
          updatedAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          clientId: 'child',
          text: 'c',
          completed: false,
          position: 0,
          parentId: 'id-1',
          updatedAt: '2026-01-02T00:00:00.000Z',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      deletedIds: [],
    });
  });

  it('can flush a tombstone-only save (delete with nothing to upsert)', async () => {
    await saveTasks('u', [], ['removed-1']);
    expect(mutation).toHaveBeenCalledWith('tasks.save', {
      tasks: [],
      deletedIds: ['removed-1'],
    });
  });

  it('is a complete no-op when there is nothing to write and nothing to delete', async () => {
    await saveTasks('u', [], []);
    expect(mutation).not.toHaveBeenCalled();
  });

  it('rethrows when the mutation fails', async () => {
    mutation.mockRejectedValue(new Error('denied'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      saveTasks('u', [
        {
          id: 'x',
          text: 'x',
          completed: false,
          position: 0,
          parent_id: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ])
    ).rejects.toThrow('denied');
    spy.mockRestore();
  });
});

