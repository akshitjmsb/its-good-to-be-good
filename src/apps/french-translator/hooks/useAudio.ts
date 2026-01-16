import { useState, useCallback, useRef } from 'react';

export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, lang: string = 'fr-FR') => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

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

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    speak,
    stop
  };
}
