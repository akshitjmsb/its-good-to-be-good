/**
 * Convex persistence for tasks and poetry recents.
 *
 * The exported signatures are unchanged from the old Supabase module so callers
 * (`src/todo.tsx`, the poetry controller) don't change. The `userId` parameter
 * is now vestigial — identity is taken from the authenticated Convex client
 * context server-side — but it is kept so call sites stay identical. It is
 * intentionally unused here (prefixed `_userId`).
 */

import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { PoetrySelection, Task } from '../../types';

const MAX_POETRY_RECENTS = 6;

interface ConvexTask {
  id: string;
  text: string;
  completed: boolean;
  position: number;
  parentId: string | null;
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
    const rows = (await convex.query(api.tasks.list, {})) as ConvexTask[];
    return rows.map((t) => ({
      id: t.id,
      text: t.text,
      completed: t.completed,
      position: t.position ?? 0,
      parent_id: t.parentId ?? null,
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
 * keyed on that id plus explicit delete tombstones — never "delete everything
 * not in my local list" — so a partial/empty local list can never wipe the
 * server. Children of a deleted task are removed server-side.
 */
export async function saveTasks(
  _userId: string,
  tasks: Task[],
  deletedIds: string[] = []
): Promise<void> {
  if (tasks.length === 0 && deletedIds.length === 0) return;

  const nowIso = new Date().toISOString();
  const rows = tasks.map((task, i) => ({
    clientId: task.id,
    text: task.text,
    completed: task.completed,
    position: task.position ?? i,
    parentId: task.parent_id ?? null,
    updatedAt: task.updated_at ?? nowIso,
    createdAt: task.created_at ?? nowIso,
  }));

  try {
    await convex.mutation(api.tasks.save, { tasks: rows, deletedIds });
  } catch (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }
}

export async function loadPoetryRecents(
  _userId: string
): Promise<PoetrySelection[]> {
  try {
    const rows = (await convex.query(api.poetry.list, {})) as PoetrySelection[];
    return rows.map((item) => ({
      poet: item.poet,
      language: item.language,
      timestamp: item.timestamp,
    }));
  } catch (error) {
    console.error('Error loading poetry recents from Convex:', error);
    return [];
  }
}

export async function savePoetryRecents(
  _userId: string,
  recents: PoetrySelection[]
): Promise<void> {
  try {
    await convex.mutation(api.poetry.replace, {
      recents: recents.map((r) => ({
        poet: r.poet,
        language: r.language,
        timestamp: r.timestamp,
      })),
    });
  } catch (error) {
    console.error('Error saving poetry recents:', error);
    throw error;
  }
}

export function recordPoetrySelection(
  recents: PoetrySelection[],
  poet: string,
  language: string
): PoetrySelection[] {
  const next = [{ poet, language, timestamp: Date.now() }, ...recents];
  const unique: PoetrySelection[] = [];
  for (const item of next) {
    const last = unique[unique.length - 1];
    if (!last || last.poet !== item.poet || last.language !== item.language) {
      unique.push(item);
    }
    if (unique.length >= MAX_POETRY_RECENTS) break;
  }
  return unique;
}
