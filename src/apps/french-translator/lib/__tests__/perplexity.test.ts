import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { callAI } = vi.hoisted(() => ({ callAI: vi.fn() }));
vi.mock('../../../../infra/ai/client', async () => {
  const actual = await vi.importActual<typeof import('../../../../infra/ai/client')>(
    '../../../../infra/ai/client'
  );
  return { ...actual, callAI };
});

import { generatePhraseWithTranslation, translateText } from '../perplexity';

beforeEach(() => callAI.mockReset());
afterEach(() => vi.clearAllMocks());

const PHRASE_JSON = JSON.stringify({
  source_text: 'Good morning',
  full_translation: 'Bonjour (bon-ZHOOR)',
  english_meaning: 'Good morning',
  breakdown: [{ word: 'Bonjour', meaning: 'Good morning', pronunciation: 'bon-ZHOOR' }],
});

describe('generatePhraseWithTranslation', () => {
  it('makes exactly ONE AI call (no separate generate + translate)', async () => {
    callAI.mockResolvedValue(PHRASE_JSON);
    await generatePhraseWithTranslation('en-to-fr');
    expect(callAI).toHaveBeenCalledTimes(1);
  });

  it('returns the invented phrase plus its breakdown', async () => {
    callAI.mockResolvedValue(PHRASE_JSON);
    const { phrase, response } = await generatePhraseWithTranslation('en-to-fr');
    expect(phrase).toBe('Good morning');
    expect(response.full_translation).toBe('Bonjour (bon-ZHOOR)');
    expect(response.breakdown).toHaveLength(1);
  });

  it('falls back to a sensible phrase when source_text is missing', async () => {
    callAI.mockResolvedValue(
      JSON.stringify({
        full_translation: 'Bonjour (bon-ZHOOR)',
        english_meaning: 'Hello',
        breakdown: [],
      })
    );
    const { phrase } = await generatePhraseWithTranslation('fr-to-en');
    expect(phrase).toBe('Bonjour (bon-ZHOOR)');
  });
});

describe('translateText', () => {
  it('parses a fenced JSON translation response', async () => {
    callAI.mockResolvedValue('```json\n' + PHRASE_JSON + '\n```');
    const res = await translateText('Good morning', 'en-to-fr');
    expect(res.english_meaning).toBe('Good morning');
  });

  it('throws a clear error on unparseable output', async () => {
    callAI.mockResolvedValue('totally not json');
    await expect(translateText('x', 'en-to-fr')).rejects.toThrow(
      /Failed to parse/
    );
  });
});
