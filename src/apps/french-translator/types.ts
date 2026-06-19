export interface WordBreakdown {
  word: string;
  meaning: string;
  pronunciation: string;
}

export interface TranslationResponse {
  full_translation: string;
  english_meaning: string;
  breakdown: WordBreakdown[];
}

export interface HistoryEntry {
  id: string;
  mode: 'en-to-fr' | 'fr-to-en';
  source_text: string;
  translation: string;
  meaning: string;
  breakdown: WordBreakdown[];
  created_at: string;
}

export type TranslationMode = 'en-to-fr' | 'fr-to-en';

export interface WordExample {
  french: string;
  english: string;
}

/**
 * The daily learning word. AI-generated, cached per-day in `content_cache`,
 * and optionally promoted into `french_history` when the user taps
 * "I learned this".
 */
export interface WordOfDay {
  /** The French word/expression being taught. */
  word: string;
  /** Phonetic pronunciation guide, e.g. "bon-ZHOOR". */
  pronunciation: string;
  /** English meaning. */
  meaning: string;
  /**
   * Grammatical note — gender for a noun ("nm" / "nf"), conjugation group
   * for a verb ("1st group -er"), or part of speech otherwise.
   */
  grammar: string;
  /** 3 example sentences showing the word in different contexts. */
  examples: WordExample[];
  /** A short cultural note or etymology tidbit. */
  note: string;
}
