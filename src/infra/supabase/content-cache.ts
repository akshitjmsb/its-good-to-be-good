import { supabase } from '../../lib/supabase';

export type CachedContentType =
  | 'archive'
  | 'analytics'
  | 'transportation-physics'
  | 'quote-deep-dive'
  | 'french-word-of-day';

export async function getCachedContent<T>(
  userId: string,
  contentType: CachedContentType,
  dateKey: string
): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('content_cache')
      .select('content')
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .eq('date_key', dateKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error getting cached content:', error);
      return null;
    }

    return (data?.content as T) ?? null;
  } catch (error) {
    console.error('Error getting cached content:', error);
    return null;
  }
}

export async function saveCachedContent<T>(
  userId: string,
  contentType: CachedContentType,
  dateKey: string,
  content: T
): Promise<void> {
  try {
    const { error } = await supabase.from('content_cache').upsert(
      {
        user_id: userId,
        content_type: contentType,
        date_key: dateKey,
        content,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,content_type,date_key',
      }
    );

    if (error) throw error;
  } catch (error) {
    console.error('Error saving cached content:', error);
    throw error;
  }
}
