import { useState, useCallback } from 'react';
import { translateText, generateRandomPhrase } from '../lib/perplexity';
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
      const phrase = await generateRandomPhrase(mode);
      if (phrase) {
        const response = await translateText(phrase, mode);
        setResult(response);
        return { phrase, response };
      }
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate phrase';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
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
    clearResult
  };
}
