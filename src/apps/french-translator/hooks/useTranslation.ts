import { useState, useCallback } from 'react';
import { translateText, generatePhraseWithTranslation } from '../lib/perplexity';
import { TranslationResponse, TranslationMode } from '../types';

export function useTranslation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResponse | null>(null);

  const translate = useCallback(async (text: string, mode: TranslationMode) => {
    if (!text.trim()) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await translateText(text, mode);
      setResult(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generatePhrase = useCallback(async (mode: TranslationMode) => {
    setIsLoading(true);
    setError(null);

    try {
      // Single AI call returns both the invented phrase and its breakdown.
      const { phrase, response } = await generatePhraseWithTranslation(mode);
      setResult(response);
      return { phrase, response };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate phrase';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Show a past translation without re-calling the API.
  const showResult = useCallback((response: TranslationResponse) => {
    setError(null);
    setResult(response);
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    result,
    translate,
    generatePhrase,
    showResult,
    clearResult
  };
}
