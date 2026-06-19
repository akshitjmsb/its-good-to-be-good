import { useState, useCallback, useRef, useEffect } from 'react';

// Web Speech can silently never fire `onend` (tab blur, voice not loaded,
// some mobile browsers). Force-reset the playing state after this long.
const TTS_TIMEOUT_MS = 10_000;

export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const speak = useCallback(
    (text: string, lang: string = 'fr-FR') => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      clearTimer();

      // Clean text - remove phonetic guides in parentheses/brackets
      const cleanText = text
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();

      if (!cleanText) return;

      setIsPlaying(true);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = 0.85;
      utterance.pitch = 1;

      const reset = () => {
        clearTimer();
        setIsPlaying(false);
      };
      utterance.onend = reset;
      utterance.onerror = reset;

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      // Safety net: if `onend` never arrives, unstick the button.
      timeoutRef.current = setTimeout(reset, TTS_TIMEOUT_MS);
    },
    [clearTimer]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    clearTimer();
    setIsPlaying(false);
  }, [clearTimer]);

  // Cancel any in-flight speech if the component unmounts.
  useEffect(() => {
    return () => {
      clearTimer();
      window.speechSynthesis.cancel();
    };
  }, [clearTimer]);

  return {
    isPlaying,
    speak,
    stop
  };
}
