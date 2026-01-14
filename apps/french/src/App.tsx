import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { TranslationInput } from './components/TranslationInput';
import { TranslationResult } from './components/TranslationResult';
import { HistoryList } from './components/HistoryList';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useTranslation } from './hooks/useTranslation';
import { useHistory } from './hooks/useHistory';
import { useAudio } from './hooks/useAudio';
import { TranslationMode, HistoryEntry } from './types';

function App() {
  const [mode, setMode] = useState<TranslationMode>('en-to-fr');

  const { isLoading, error, result, translate, generatePhrase, clearResult } = useTranslation();
  const { history, saveToHistory, clearHistory } = useHistory();
  const { isPlaying, speak } = useAudio();

  const handleModeToggle = useCallback(() => {
    setMode((m) => (m === 'en-to-fr' ? 'fr-to-en' : 'en-to-fr'));
    clearResult();
  }, [clearResult]);

  const handleTranslate = useCallback(async (text: string) => {
    const translationResult = await translate(text, mode);
    if (translationResult) {
      await saveToHistory(mode, text, translationResult);
    }
  }, [mode, translate, saveToHistory]);

  const handleGeneratePhrase = useCallback(async () => {
    const phraseResult = await generatePhrase(mode);
    if (phraseResult) {
      await saveToHistory(mode, phraseResult.phrase, phraseResult.response);
    }
  }, [mode, generatePhrase, saveToHistory]);

  const handleSelectHistoryEntry = useCallback((_entry: HistoryEntry) => {
    // For MVP, clicking history entry just clears current result
    // Future: could show the entry directly without re-translating
    clearResult();
  }, [clearResult]);

  const handlePlayAudio = useCallback((text: string) => {
    speak(text, 'fr-FR');
  }, [speak]);

  const handleClearHistory = useCallback(async () => {
    if (window.confirm('Clear all translation history?')) {
      await clearHistory();
    }
  }, [clearHistory]);

  return (
    <div className="min-h-screen bg-white text-black font-mono flex flex-col items-center p-4 md:p-12 overflow-x-hidden">
      <Header
        mode={mode}
        onModeToggle={handleModeToggle}
        onClearHistory={handleClearHistory}
      />

      <TranslationInput
        mode={mode}
        isLoading={isLoading}
        onTranslate={handleTranslate}
        onGeneratePhrase={handleGeneratePhrase}
      />

      {error && <ErrorDisplay message={error} />}

      {result && (
        <TranslationResult
          result={result}
          mode={mode}
          isAudioPlaying={isPlaying}
          onPlayAudio={handlePlayAudio}
        />
      )}

      <HistoryList
        history={history}
        onSelectEntry={handleSelectHistoryEntry}
        onPlayAudio={handlePlayAudio}
      />

      <footer className="mt-12 opacity-5 text-[8px] font-black uppercase tracking-[0.8em] py-8 text-center w-full">
        French Translator v1.0
      </footer>
    </div>
  );
}

export default App;
