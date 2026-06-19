import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getAuthState, subscribeAuth } from '../../../domains/auth/store';
import { HistoryEntry, TranslationResponse, TranslationMode } from '../types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // A quiet line shown when a save can't be persisted (e.g. auth not ready).
  const [notice, setNotice] = useState<string | null>(null);

  // Load history from Supabase
  const loadHistory = useCallback(async () => {
    const userId = getAuthState().user?.id;
    if (!userId) {
      setHistory([]);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('french_history')
        .select('*')
        .eq('user_id', userId)
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
    const { status, user } = getAuthState();
    const userId = user?.id;
    if (!userId) {
      // Surface the reason instead of dropping the save on the floor.
      setNotice(
        status === 'loading'
          ? 'Signing you in… not saved yet. Try again in a moment.'
          : 'Sign in to save your French history.'
      );
      return null;
    }
    setNotice(null);
    try {
      const { data, error } = await supabase
        .from('french_history')
        .insert({
          user_id: userId,
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
    const userId = getAuthState().user?.id;
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('french_history')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, []);

  // Load on mount, and again whenever the signed-in user changes — auth may
  // still be hydrating at first render, which would otherwise leave history
  // permanently empty.
  useEffect(() => {
    loadHistory();
    let lastUserId = getAuthState().user?.id;
    const unsub = subscribeAuth((state) => {
      if (state.user?.id !== lastUserId) {
        lastUserId = state.user?.id;
        setNotice(null);
        loadHistory();
      }
    });
    return unsub;
  }, [loadHistory]);

  return {
    history,
    isLoading,
    notice,
    saveToHistory,
    clearHistory,
    refreshHistory: loadHistory
  };
}
