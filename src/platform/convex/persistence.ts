/**
 * Convex persistence for tasks.
 *
 * The exported signatures are unchanged from the old Supabase module so the
 * caller (`src/modules/todo/entry.ts`) doesn't change. The `userId` parameter is now
 * vestigial — identity is taken from the authenticated Convex client context
 * server-side — but it is kept so call sites stay identical. It is
 * intentionally unused here (prefixed `_userId`).
 */

import { convex } from './client';
import { api } from '../../../convex/_generated/api';
import { ensureFreshAuth } from '../auth/session';
import type { Task, TaskDeletion } from '../../types';

interface ConvexTask {
  id: string;
  text: string;
  note?: string;
  completed: boolean;
  position: number;
  parentId: string | null;
  remindAt?: string | null;
  reminderRevision?: string | null;
  updatedAt: string;
  createdAt: string;
}

/**
 * Load the user's tasks.
 *
 * Throws on a real failure (network/query error) rather than swallowing it and
 * returning `[]`. That distinction is load-bearing: the caller uses a
 * successful load to unlock saves, and a failed load must NOT masquerade as
 * "no tasks". A genuinely empty list still resolves to `[]`.
 */
export async function loadTasks(_userId: string): Promise<Task[]> {
  try {
    // The HTTP client holds no session — attach a fresh JWT per call.
    await ensureFreshAuth();
    const rows = (await convex.query(api.tasks.list, {})) as ConvexTask[];
    return rows.map(t => ({
      id: t.id,
      text: t.text,
      note: t.note ?? '',
      completed: t.completed,
      position: t.position ?? 0,
      parent_id: t.parentId ?? null,
      remind_at: t.remindAt ?? null,
      reminder_revision: t.reminderRevision ?? null,
      updated_at: t.updatedAt ?? undefined,
      created_at: t.createdAt ?? undefined,
    }));
  } catch (error) {
    console.error('Error loading tasks from Convex:', error);
    throw error;
  }
}

/**
 * Persist the task list for a user.
 *
 * Every task carries a stable client-generated `id`. The save is an upsert
 * keyed on that id plus revisioned delete tombstones — never "delete
 * everything not in my local list" — so a partial/empty local list can never
 * wipe the server. Children of a deleted task are removed server-side.
 */
export async function saveTasks(
  _userId: string,
  tasks: Task[],
  deleted: TaskDeletion[] = []
): Promise<void> {
  if (tasks.length === 0 && deleted.length === 0) return;

  const nowIso = new Date().toISOString();
  const rows = tasks.map((task, i) => ({
    clientId: task.id,
    text: task.text,
    note: task.note ?? '',
    completed: task.completed,
    position: task.position ?? i,
    parentId: task.parent_id ?? null,
    remindAt: task.remind_at ?? null,
    reminderRevision: task.reminder_revision ?? null,
    updatedAt: task.updated_at ?? nowIso,
    createdAt: task.created_at ?? nowIso,
  }));

  try {
    // The HTTP client holds no session — attach a fresh JWT per call.
    await ensureFreshAuth();
    await convex.mutation(api.tasks.save, {
      tasks: rows,
      deleted: deleted.map(record => ({
        clientId: record.id,
        deletedAt: record.deleted_at,
      })),
    });
  } catch (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }
}
