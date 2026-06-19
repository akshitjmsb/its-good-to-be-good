import { WordOfDay } from '../types';

/**
 * Injected dependencies for {@link loadWordOfDay}. Keeping the orchestration
 * pure (no Supabase / auth imports) lets the cache-first logic be unit-tested
 * without a DOM or network.
 */
export interface WordOfDayDeps {
  userId: string | undefined;
  dateKey: string;
  getCached: (userId: string, dateKey: string) => Promise<WordOfDay | null>;
  saveCached: (
    userId: string,
    dateKey: string,
    word: WordOfDay
  ) => Promise<void>;
  fetchLearned: (userId: string) => Promise<{ words: string[]; count: number }>;
  generate: (words: string[], count: number) => Promise<WordOfDay>;
}

/**
 * Resolve today's word: cache-first for a signed-in user, otherwise an
 * ephemeral generation. On a cache miss we generate using the learner's
 * history as the avoid-list, then persist for the rest of the day. A failed
 * cache write is swallowed — it must never blank the returned word.
 */
export async function loadWordOfDay(deps: WordOfDayDeps): Promise<WordOfDay> {
  const { userId, dateKey } = deps;

  if (!userId) {
    return deps.generate([], 0);
  }

  const cached = await deps.getCached(userId, dateKey);
  if (cached) return cached;

  const { words, count } = await deps.fetchLearned(userId);
  const word = await deps.generate(words, count);
  await deps
    .saveCached(userId, dateKey, word)
    .catch((err) => console.error('Failed to cache word of the day:', err));
  return word;
}
