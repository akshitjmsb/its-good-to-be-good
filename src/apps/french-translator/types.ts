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
