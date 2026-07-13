/**
 * To Do's write-ahead log — the SDK's durable primitives typed to the
 * task snapshot. The mechanism (write-before-network, corrupt-reads-as-
 * absent, safe no-ops without localStorage) lives in `src/sdk/durable.ts`.
 */

import type { Task } from '../../types';
import {
  createWal as createGenericWal,
  walKey,
  type StorageLike,
  type Wal as GenericWal,
} from '../../sdk/durable';

export { getBrowserStorage, type StorageLike } from '../../sdk/durable';

export interface WalSnapshot {
  tasks: Task[];
  deletedIds: string[];
}

export type Wal = GenericWal<WalSnapshot>;

export function walKeyFor(userId: string): string {
  return walKey('todo', userId);
}

export function createWal(storage: StorageLike | null, key: string): Wal {
  return createGenericWal<WalSnapshot>(storage, key, parsed => {
    const candidate = parsed as Partial<WalSnapshot> | null;
    if (!candidate || !Array.isArray(candidate.tasks)) return null;
    return {
      tasks: candidate.tasks as Task[],
      deletedIds: Array.isArray(candidate.deletedIds) ? candidate.deletedIds : [],
    };
  });
}
