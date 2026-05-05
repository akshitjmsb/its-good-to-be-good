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
      .select('text, completed')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      if (error) console.error('Error loading tasks from Supabase:', error);
      return [];
    }

    return data.map(task => ({
      text: task.text,
      completed: task.completed,
    }));
  } catch (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
}

export async function saveTasks(userId: string, tasks: Task[]): Promise<void> {
  try {
    const tasksToInsert = tasks.map(task => ({
      user_id: userId,
      text: task.text,
      completed: task.completed,
    }));
    await replaceAllForUser('tasks', userId, tasksToInsert);
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
