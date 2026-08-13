/**
 * To Do's write-ahead log — the SDK's durable primitives typed to the
 * task snapshot. The mechanism (write-before-network, corrupt-reads-as-
 * absent, safe no-ops without localStorage) lives in `src/sdk/durable.ts`.
 */

import type { Task, TaskDeletion } from '../../types';
import {
  createWal as createGenericWal,
  walKey,
  type StorageLike,
  type Wal as GenericWal,
} from '../../sdk/durable';

export { getBrowserStorage, type StorageLike } from '../../sdk/durable';

export interface WalSnapshot {
  tasks: Task[];
  /** Explicit delete records survive reloads and are sent to the server. */
  deleted: TaskDeletion[];
}

export type Wal = GenericWal<WalSnapshot>;

export interface LegacyWalSnapshot {
  key: string;
  snapshot: WalSnapshot;
}

export function walKeyFor(userId: string): string {
  return walKey('todo', userId);
}

export function createWal(storage: StorageLike | null, key: string): Wal {
  return createGenericWal<WalSnapshot>(storage, key, parsed => {
    const candidate = parsed as Partial<WalSnapshot> & { deletedIds?: unknown } | null;
    if (!candidate || !Array.isArray(candidate.tasks)) return null;

    const deleted = Array.isArray(candidate.deleted)
      ? candidate.deleted.flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const record = item as { id?: unknown; deleted_at?: unknown };
        return typeof record.id === 'string' && typeof record.deleted_at === 'string'
          ? [{ id: record.id, deleted_at: record.deleted_at }]
          : [];
      })
      : [];

    // Version 1 WALs used bare ids. Preserve that deletion intent during the
    // upgrade rather than allowing an old local snapshot to revive a task.
    const legacyDeleted = Array.isArray(candidate.deletedIds)
      ? candidate.deletedIds.flatMap(id =>
        typeof id === 'string' ? [{ id, deleted_at: new Date().toISOString() }] : []
      )
      : [];

    return {
      tasks: candidate.tasks as Task[],
      deleted: [...deleted, ...legacyDeleted],
    };
  });
}

/**
 * Discover journals created under an older auth identity on this device.
 * Nothing is copied or removed here: the UI asks the signed-in owner before
 * restoring data across identities.
 */
export function findLegacyWalSnapshots(
  storage: StorageLike | null,
  currentUserId: string
): LegacyWalSnapshot[] {
  if (!storage) return [];
  const enumerable = storage as StorageLike & {
    readonly length?: number;
    key?: (index: number) => string | null;
  };
  if (typeof enumerable.length !== 'number' || typeof enumerable.key !== 'function') {
    return [];
  }

  const currentKey = walKeyFor(currentUserId);
  const prefix = 'king:todo:wal:';
  const found: LegacyWalSnapshot[] = [];
  for (let index = 0; index < enumerable.length; index += 1) {
    const key = enumerable.key(index);
    if (!key || key === currentKey || !key.startsWith(prefix)) continue;
    const snapshot = createWal(storage, key).read();
    if (snapshot && (snapshot.tasks.length > 0 || snapshot.deleted.length > 0)) {
      found.push({ key, snapshot });
    }
  }
  return found;
}
