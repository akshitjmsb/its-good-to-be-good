import { supabase } from '../../lib/supabase';
import { PoetrySelection, Task } from '../../types';

const MAX_POETRY_RECENTS = 6;

/**
 * Replace all rows belonging to a user in a table with a fresh set.
 * Deletes the user's existing rows then inserts the new ones in a single
 * round-trip. Empty inputs short-circuit after the delete.
 */
export async function replaceAllForUser<TRow extends Record<string, unknown>>(
  table: string,
  userId: string,
  rows: TRow[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error(`Error deleting existing rows from ${table}:`, deleteError);
  }

  if (!rows.length) return;

  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) throw insertError;
}

/**
 * Load a user's tasks.
 *
 * Throws on a real failure (network/query error) rather than swallowing it
 * and returning `[]`. That distinction is load-bearing: the caller uses a
 * successful load to unlock saves, and a failed load must NOT masquerade as
 * "no tasks". A genuinely empty list still resolves to `[]`.
 *
 * `updated_at` is selected so the client can do last-writer-wins merges;
 * `created_at` is selected only as a deterministic ordering tiebreaker.
 */
export async function loadTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, text, completed, position, parent_id, updated_at, created_at')
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error loading tasks from Supabase:', error);
    throw error;
  }

  return (data ?? []).map(task => ({
    id: task.id,
    text: task.text,
    completed: task.completed,
    position: task.position ?? 0,
    parent_id: task.parent_id ?? null,
    updated_at: task.updated_at ?? undefined,
    created_at: task.created_at ?? undefined,
  }));
}

/**
 * Persist the task list for a user.
 *
 * Every task carries a stable client-generated `id`, which makes the save two
 * deterministic, *bounded* steps:
 *
 *   1. Upsert the given tasks keyed on `id` (new rows and edits share one
 *      path). `updated_at` is written through; `created_at` is deliberately
 *      omitted so the server keeps its own creation timestamp on conflict.
 *   2. Delete exactly the ids in `deletedIds` — the caller's explicit
 *      tombstones. This replaces the old "select all, delete anything not in
 *      my local list" step, which deleted a second device's tasks on every
 *      save. `ON DELETE CASCADE` on `parent_id` clears children server-side.
 *
 * Note: there is no "delete everything not present locally" path any more, so
 * a partial/empty local list can never wipe the server.
 */
export async function saveTasks(
  userId: string,
  tasks: Task[],
  deletedIds: string[] = []
): Promise<void> {
  if (tasks.length === 0 && deletedIds.length === 0) return;

  try {
    if (tasks.length > 0) {
      const rows = tasks.map((task, i) => ({
        id: task.id,
        user_id: userId,
        text: task.text,
        completed: task.completed,
        position: task.position ?? i,
        parent_id: task.parent_id ?? null,
        updated_at: task.updated_at ?? new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('tasks')
        .upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }

    if (deletedIds.length > 0) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', deletedIds);
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }
}

export async function loadPoetryRecents(
  userId: string
): Promise<PoetrySelection[]> {
  try {
    const { data, error } = await supabase
      .from('poetry_recents')
      .select('poet, language, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(MAX_POETRY_RECENTS);

    if (error || !data) {
      if (error)
        console.error('Error loading poetry recents from Supabase:', error);
      return [];
    }

    return data.map(item => ({
      poet: item.poet,
      language: item.language,
      timestamp: item.timestamp,
    }));
  } catch (error) {
    console.error('Error loading poetry recents:', error);
    return [];
  }
}

export async function savePoetryRecents(
  userId: string,
  recents: PoetrySelection[]
): Promise<void> {
  try {
    const recentsToInsert = recents.map(recent => ({
      user_id: userId,
      poet: recent.poet,
      language: recent.language,
      timestamp: recent.timestamp,
    }));
    await replaceAllForUser('poetry_recents', userId, recentsToInsert);
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
