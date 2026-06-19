import { describe, expect, it, vi } from 'vitest';
import { loadWordOfDay, WordOfDayDeps } from '../loadWordOfDay';
import { WordOfDay } from '../../types';

const WORD: WordOfDay = {
  word: 'bonjour',
  pronunciation: 'bon-ZHOOR',
  meaning: 'hello',
  grammar: 'interjection',
  examples: [{ french: 'Bonjour!', english: 'Hello!' }],
  note: 'good day',
};

function makeDeps(over: Partial<WordOfDayDeps> = {}): WordOfDayDeps {
  return {
    userId: 'u-1',
    dateKey: '2026-06-19',
    getCached: vi.fn().mockResolvedValue(null),
    saveCached: vi.fn().mockResolvedValue(undefined),
    fetchLearned: vi.fn().mockResolvedValue({ words: [], count: 0 }),
    generate: vi.fn().mockResolvedValue(WORD),
    ...over,
  };
}

describe('loadWordOfDay', () => {
  it('returns the cached word and never generates on a hit', async () => {
    const deps = makeDeps({ getCached: vi.fn().mockResolvedValue(WORD) });
    const result = await loadWordOfDay(deps);
    expect(result).toEqual(WORD);
    expect(deps.generate).not.toHaveBeenCalled();
    expect(deps.fetchLearned).not.toHaveBeenCalled();
    expect(deps.saveCached).not.toHaveBeenCalled();
  });

  it('generates with the learned words on a cache miss, then persists', async () => {
    const deps = makeDeps({
      fetchLearned: vi.fn().mockResolvedValue({ words: ['merci'], count: 1 }),
    });
    const result = await loadWordOfDay(deps);
    expect(result).toEqual(WORD);
    expect(deps.generate).toHaveBeenCalledWith(['merci'], 1);
    expect(deps.saveCached).toHaveBeenCalledWith('u-1', '2026-06-19', WORD);
  });

  it('generates ephemerally with no cache/dedup when anonymous', async () => {
    const deps = makeDeps({ userId: undefined });
    const result = await loadWordOfDay(deps);
    expect(result).toEqual(WORD);
    expect(deps.generate).toHaveBeenCalledWith([], 0);
    expect(deps.getCached).not.toHaveBeenCalled();
    expect(deps.fetchLearned).not.toHaveBeenCalled();
    expect(deps.saveCached).not.toHaveBeenCalled();
  });

  it('still returns the word when the cache write fails', async () => {
    const deps = makeDeps({
      saveCached: vi.fn().mockRejectedValue(new Error('rls denied')),
    });
    await expect(loadWordOfDay(deps)).resolves.toEqual(WORD);
  });
});
