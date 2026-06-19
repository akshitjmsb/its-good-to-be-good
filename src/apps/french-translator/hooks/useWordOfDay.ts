import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getAuthState, subscribeAuth } from '../../../domains/auth/store';
import {
  getCachedContent,
  saveCachedContent,
} from '../../../infra/supabase/content-cache';
import { getTodayKey } from '../../../core/time';
import { generateWordOfDay } from '../lib/wordOfDay';
import { loadWordOfDay } from '../lib/loadWordOfDay';
import { WordOfDay } from '../types';

const CONTENT_TYPE = 'french-word-of-day';

/**
 * Pulls the learner's already-seen words (and total count) from
 * `french_history` so the generator never repeats and can scale difficulty.
 */
async function fetchLearnedWords(
  userId: string
): Promise<{ words: string[]; count: number }> {
  const { data, error } = await supabase
    .from('french_history')
    .select('source_text')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  const words = (data ?? [])
    .map((row) => (row.source_text as string | null)?.trim())
    .filter((w): w is string => !!w);
  return { words, count: words.length };
}

/**
 * Loads (or generates + caches) the daily French word.
 *
 * Cache-first: today's `content_cache` row wins. On a miss we generate with
 * the learner's history as the avoid-list, then persist for the rest of the
 * day. Without an authenticated user we still generate an ephemeral word so
 * the hero never sits empty — it just isn't cached or deduped.
 */
export function useWordOfDay() {
  const [word, setWord] = useState<WordOfDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { status, user } = getAuthState();
    const userId = user?.id;
    const dateKey = getTodayKey();

    // Auth still hydrating — hold the spinner; the auth subscription will
    // re-run load() once the session resolves (avoids a wasted, uncached
    // generation against an anonymous identity).
    if (status === 'loading') return;

    try {
      const resolved = await loadWordOfDay({
        userId,
        dateKey,
        getCached: (uid, key) =>
          getCachedContent<WordOfDay>(uid, CONTENT_TYPE, key),
        saveCached: (uid, key, w) =>
          saveCachedContent(uid, CONTENT_TYPE, key, w),
        fetchLearned: fetchLearnedWords,
        generate: generateWordOfDay,
      });
      setWord(resolved);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not load the word of the day';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Re-run once auth leaves 'loading' or the user changes, so we move from
    // the spinner to the real (cached/deduped) word for the signed-in user.
    let last = `${getAuthState().status}:${getAuthState().user?.id ?? ''}`;
    const unsub = subscribeAuth((state) => {
      const next = `${state.status}:${state.user?.id ?? ''}`;
      if (next !== last) {
        last = next;
        load();
      }
    });
    return unsub;
  }, [load]);

  return { word, isLoading, error, reload: load };
}
