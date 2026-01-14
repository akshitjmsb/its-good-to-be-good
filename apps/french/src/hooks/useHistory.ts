import { useState, useEffect, useCallback } from 'react';
import { supabase, DEFAULT_USER_ID } from '../lib/supabase';
import { HistoryEntry, TranslationResponse, TranslationMode } from '../types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from Supabase
  const loadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('french_history')
        .select('*')
        .eq('user_id', DEFAULT_USER_ID)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback(async (
    mode: TranslationMode,
    sourceText: string,
    result: TranslationResponse
  ) => {
    try {
      const { data, error } = await supabase
        .from('french_history')
        .insert({
          user_id: DEFAULT_USER_ID,
          mode,
          source_text: sourceText,
          translation: result.full_translation,
          meaning: result.english_meaning,
          breakdown: result.breakdown
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      if (data) {
        setHistory(prev => [data, ...prev]);
      }

      return data;
    } catch (err) {
      console.error('Failed to save to history:', err);
      return null;
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('french_history')
        .delete()
        .eq('user_id', DEFAULT_USER_ID);

      if (error) throw error;
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    isLoading,
    saveToHistory,
    clearHistory,
    refreshHistory: loadHistory
  };
}
