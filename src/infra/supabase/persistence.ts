import { supabase } from '../../lib/supabase';
import { ChatMessage, PoetrySelection, Task } from '../../types';

const MAX_POETRY_RECENTS = 6;
const MAX_GUITAR_RECENT_PICKS = 30;
const MAX_CHAT_HISTORY = 100;

export async function loadChatHistory(userId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('role, text')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(MAX_CHAT_HISTORY);

    if (error || !data) {
      if (error) console.error('Error loading chat history from Supabase:', error);
      return [];
    }

    return data
      .filter(
        item =>
          (item.role === 'user' || item.role === 'model') &&
          typeof item.text === 'string'
      )
      .map(item => ({ role: item.role, text: item.text }));
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}

export async function saveChatHistory(
  userId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    const { error: deleteError } = await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting existing chat history:', deleteError);
    }

    if (!messages.length) return;

    const payload = messages
      .slice(-MAX_CHAT_HISTORY)
      .filter(
        msg =>
          (msg.role === 'user' || msg.role === 'model') &&
          typeof msg.text === 'string' &&
          msg.text.trim().length > 0
      )
      .map(msg => ({
        user_id: userId,
        role: msg.role,
        text: msg.text,
      }));

    if (!payload.length) return;

    const { error: insertError } = await supabase
      .from('chat_history')
      .insert(payload);
    if (insertError) throw insertError;
  } catch (error) {
    console.error('Error saving chat history:', error);
    throw error;
  }
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
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting existing tasks:', deleteError);
    }

    if (!tasks.length) return;

    const tasksToInsert = tasks.map(task => ({
      user_id: userId,
      text: task.text,
      completed: task.completed,
    }));

    const { error: insertError } = await supabase
      .from('tasks')
      .insert(tasksToInsert);
    if (insertError) throw insertError;
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
    const { error: deleteError } = await supabase
      .from('poetry_recents')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting existing poetry recents:', deleteError);
    }

    if (!recents.length) return;

    const recentsToInsert = recents.map(recent => ({
      user_id: userId,
      poet: recent.poet,
      language: recent.language,
      timestamp: recent.timestamp,
    }));

    const { error: insertError } = await supabase
      .from('poetry_recents')
      .insert(recentsToInsert);

    if (insertError) throw insertError;
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

export async function loadGuitarRecentPicks(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('guitar_recent_picks')
      .select('song_title, artist')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_GUITAR_RECENT_PICKS);

    if (error || !data) {
      if (error)
        console.error(
          'Error loading guitar recent picks from Supabase:',
          error
        );
      return [];
    }

    return data.map(item => `${item.song_title} — ${item.artist}`);
  } catch (error) {
    console.error('Error loading guitar recent picks:', error);
    return [];
  }
}

export async function saveGuitarRecentPick(
  userId: string,
  songTitle: string,
  artist: string
): Promise<void> {
  try {
    const { error: insertError } = await supabase
      .from('guitar_recent_picks')
      .insert({
        user_id: userId,
        song_title: songTitle,
        artist,
      });

    if (insertError) throw insertError;

    const { data: allPicks } = await supabase
      .from('guitar_recent_picks')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (allPicks && allPicks.length > MAX_GUITAR_RECENT_PICKS) {
      const idsToDelete = allPicks
        .slice(MAX_GUITAR_RECENT_PICKS)
        .map(p => p.id);
      await supabase.from('guitar_recent_picks').delete().in('id', idsToDelete);
    }
  } catch (error) {
    console.error('Error saving guitar recent pick:', error);
    throw error;
  }
}
