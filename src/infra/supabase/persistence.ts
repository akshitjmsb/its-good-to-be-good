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

export async function loadTasks(userId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, text, completed, position, parent_id')
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (error || !data) {
      if (error) console.error('Error loading tasks from Supabase:', error);
      return [];
    }

    return data.map(task => ({
      id: task.id,
      text: task.text,
      completed: task.completed,
      position: task.position ?? 0,
      parent_id: task.parent_id ?? null,
    }));
  } catch (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
}

/**
 * Safely persist the full task list for a user.
 *
 * Strategy: upsert rows that have IDs, insert new rows, then delete any
 * DB rows that are no longer in the local list. This avoids the dangerous
 * "delete-all → insert" pattern that can wipe data on an empty load.
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
    // Separate tasks that already have a server ID from brand-new ones.
    const existing = tasks.filter(t => t.id);
    const brandNew = tasks.filter(t => !t.id);

    // 1. Upsert existing tasks (update text, completed, position, parent_id).
    if (existing.length > 0) {
      const rows = existing.map((task, i) => ({
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

    // 2. Insert brand-new tasks.
    if (brandNew.length > 0) {
      const rows = brandNew.map((task, i) => ({
        user_id: userId,
        text: task.text,
        completed: task.completed,
        position: task.position ?? existing.length + i,
        parent_id: task.parent_id ?? null,
      }));
      const { error } = await supabase.from('tasks').insert(rows);
      if (error) throw error;
    }

    // 3. Delete tasks that were removed locally.
    //    Fetch current server IDs, diff against local IDs.
    const { data: serverRows } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId);

    if (serverRows) {
      const localIds = new Set(existing.map(t => t.id));
      const toDelete = serverRows
        .map(r => r.id as string)
        .filter(id => !localIds.has(id));

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .in('id', toDelete);
        if (error) {
          console.error('Error deleting removed tasks:', error);
        }
      }
    }

    // 4. Re-read to get server-generated IDs for newly inserted tasks.
    const { data } = await supabase
      .from('tasks')
      .select('id, text, completed, position, parent_id')
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (data) {
      // Match by position + text for new tasks that didn't have IDs.
      data.forEach((row) => {
        const match = tasks.find(
          t => !t.id && t.text === row.text && t.position === row.position
        );
        if (match) {
          match.id = row.id;
        }
      });
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
