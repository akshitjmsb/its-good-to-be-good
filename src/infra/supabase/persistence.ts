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
 * successful load to unlock saves, and a failed load that masqueraded as
 * "no tasks" would let the next save's delete-stale step wipe every real
 * row on the server. A genuinely empty list still resolves to `[]`.
 */
export async function loadTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, text, completed, position, parent_id')
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
  }));
}

/**
 * Safely persist the full task list for a user.
 *
 * Every task carries a stable `id` — client-generated (a UUID) the moment
 * it is created, never invented by the server. That turns the whole save
 * into two deterministic steps:
 *
 *   1. Upsert every task keyed on `id`. One statement handles both new
 *      rows and edits; no insert-then-reload dance, no guessing which
 *      server row belongs to which local task by text + position.
 *   2. Delete any server row whose id is no longer present locally. This
 *      runs *after* the upsert so freshly created rows are already on the
 *      server and never get diffed away.
 *
 * Safety guard: if `tasks` is empty **and** `opts.loadedSuccessfully` is
 * not explicitly `true`, the save is skipped entirely. This prevents an
 * empty initial load (network error, wrong user, etc.) from triggering a
 * wipe on the next auto-save.
 */
export async function saveTasks(
  userId: string,
  tasks: Task[],
  opts: { loadedSuccessfully?: boolean } = {}
): Promise<void> {
  // ── Guard: never wipe all tasks unless we know the load was clean ──
  if (tasks.length === 0 && !opts.loadedSuccessfully) {
    console.warn(
      'saveTasks: skipped — empty task list without confirmed load. ' +
        'This prevents accidental data loss.'
    );
    return;
  }

  try {
    // 1. Upsert every task. Parents and their children can share one
    //    statement: the self-referencing FK is checked at statement end,
    //    by which point every parent row is already present.
    if (tasks.length > 0) {
      const rows = tasks.map((task, i) => ({
        id: task.id,
        user_id: userId,
        text: task.text,
        completed: task.completed,
        position: task.position ?? i,
        parent_id: task.parent_id ?? null,
      }));
      const { error } = await supabase
        .from('tasks')
        .upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }

    // 2. Delete rows the user removed locally. ON DELETE CASCADE on
    //    parent_id means deleting a parent also clears any children, so a
    //    single `.in()` covers parents and orphaned subtasks alike.
    const { data: serverRows, error: selectError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId);
    if (selectError) throw selectError;

    if (serverRows) {
      const localIds = new Set(tasks.map(t => t.id));
      const toDelete = serverRows
        .map(r => r.id as string)
        .filter(id => !localIds.has(id));

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .in('id', toDelete);
        if (error) throw error;
      }
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
