import { describe, expect, it } from 'vitest';
import {
  createWal,
  findLegacyWalSnapshots,
  walKeyFor,
  type StorageLike,
  type WalSnapshot,
} from '../wal';
import type { Task } from '../../../types';

function memoryStorage(seed: Record<string, string> = {}): StorageLike & { dump: Record<string, string> } {
  const dump: Record<string, string> = { ...seed };
  return {
    dump,
    getItem: (k) => (k in dump ? dump[k] : null),
    setItem: (k, v) => { dump[k] = v; },
    removeItem: (k) => { delete dump[k]; },
  };
}

const task = (id: string): Task => ({ id, text: id, completed: false, position: 0, parent_id: null });

describe('createWal', () => {
  it('round-trips a snapshot through storage', () => {
    const storage = memoryStorage();
    const wal = createWal(storage, 'k');
    const snap: WalSnapshot = {
      tasks: [task('a'), task('b')],
      deleted: [{ id: 'x', deleted_at: '2026-01-01T00:00:00.000Z' }],
    };
    wal.write(snap);
    expect(wal.read()).toEqual(snap);
  });

  it('clear() removes the entry', () => {
    const storage = memoryStorage();
    const wal = createWal(storage, 'k');
    wal.write({ tasks: [task('a')], deleted: [] });
    wal.clear();
    expect(wal.read()).toBeNull();
  });

  it('returns null for a missing or corrupt entry instead of throwing', () => {
    expect(createWal(memoryStorage(), 'absent').read()).toBeNull();
    expect(createWal(memoryStorage({ k: 'not json {' }), 'k').read()).toBeNull();
    expect(createWal(memoryStorage({ k: '{"nope":1}' }), 'k').read()).toBeNull();
  });

  it('no-ops safely when storage is unavailable (private mode / SSR)', () => {
    const wal = createWal(null, 'k');
    expect(wal.write({ tasks: [task('a')], deleted: [] })).toBe(false);
    expect(wal.read()).toBeNull();
    expect(() => wal.clear()).not.toThrow();
  });

  it('reports a rejected local write instead of pretending the WAL survived', () => {
    const rejectedStorage: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
      removeItem: () => {},
    };
    expect(createWal(rejectedStorage, 'k').write({ tasks: [task('a')], deleted: [] })).toBe(false);
  });

  it('survives a page close during an outage: a new WAL on the same storage recovers the work', () => {
    const storage = memoryStorage();
    const key = walKeyFor('user-1');

    // Session 1: user adds tasks while offline; WAL captures them, then the
    // page is closed (the WAL instance is discarded, storage persists).
    const session1 = createWal(storage, key);
    session1.write({ tasks: [task('draft-1'), task('draft-2')], deleted: [] });

    // Session 2: fresh boot, brand-new WAL over the same storage.
    const session2 = createWal(storage, key);
    const recovered = session2.read();
    expect(recovered?.tasks.map(t => t.id)).toEqual(['draft-1', 'draft-2']);
  });

  it('upgrades a legacy bare-id deletion without dropping that intent', () => {
    const storage = memoryStorage({
      legacy: JSON.stringify({ tasks: [task('a')], deletedIds: ['gone'] }),
    });
    const recovered = createWal(storage, 'legacy').read();
    expect(recovered?.deleted).toHaveLength(1);
    expect(recovered?.deleted[0]?.id).toBe('gone');
    expect(recovered?.deleted[0]?.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('offers prior-identity journals without touching the current owner', () => {
    const values = new Map<string, string>();
    const storage: StorageLike & { length: number; key(index: number): string | null } = {
      get length() { return values.size; },
      key: index => [...values.keys()][index] ?? null,
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => void values.set(key, value),
      removeItem: key => void values.delete(key),
    };
    createWal(storage, walKeyFor('old-user')).write({ tasks: [task('old')], deleted: [] });
    createWal(storage, walKeyFor('current-user')).write({ tasks: [task('current')], deleted: [] });

    const found = findLegacyWalSnapshots(storage, 'current-user');

    expect(found).toHaveLength(1);
    expect(found[0].snapshot.tasks[0].id).toBe('old');
    expect(storage.getItem(walKeyFor('old-user'))).not.toBeNull();
  });
});
