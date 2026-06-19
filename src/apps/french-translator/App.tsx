import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { TabSwitcher, FrenchTab } from './components/TabSwitcher';
import { WordOfDay } from './components/WordOfDay';
import { TranslationInput } from './components/TranslationInput';
import { TranslationResult } from './components/TranslationResult';
import { HistoryList } from './components/HistoryList';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useTranslation } from './hooks/useTranslation';
import { useHistory } from './hooks/useHistory';
import { useAudio } from './hooks/useAudio';
import { useWordOfDay } from './hooks/useWordOfDay';
import { TranslationMode, HistoryEntry, WordOfDay as WordOfDayType } from './types';

function App() {
  const [tab, setTab] = useState<FrenchTab>('word');
  const [mode, setMode] = useState<TranslationMode>('en-to-fr');
  const [input, setInput] = useState('');

  const { isLoading, error, result, translate, generatePhrase, showResult, clearResult } =
    useTranslation();
  const { history, notice, saveToHistory, clearHistory } = useHistory();
  const { isPlaying, speak } = useAudio();
  const { word, isLoading: wordLoading, error: wordError, reload: reloadWord } =
    useWordOfDay();

  const handleModeToggle = useCallback(() => {
    setMode((m) => (m === 'en-to-fr' ? 'fr-to-en' : 'en-to-fr'));
    clearResult();
  }, [clearResult]);

  const handleTranslate = useCallback(
    async (text: string) => {
      const translationResult = await translate(text, mode);
      if (translationResult) {
        setInput('');
        await saveToHistory(mode, text, translationResult);
      }
    },
    [mode, translate, saveToHistory]
  );

  const handleGeneratePhrase = useCallback(async () => {
    const phraseResult = await generatePhrase(mode);
    if (phraseResult) {
      setInput(phraseResult.phrase);
      await saveToHistory(mode, phraseResult.phrase, phraseResult.response);
    }
  }, [mode, generatePhrase, saveToHistory]);

  // Clicking a past entry re-displays it (no API call), restores its mode and
  // source text, and brings the translator into view.
  const handleSelectHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      setMode(entry.mode);
      setInput(entry.source_text);
      showResult({
        full_translation: entry.translation,
        english_meaning: entry.meaning,
        breakdown: entry.breakdown || [],
      });
      setTab('translator');
    },
    [showResult]
  );

  const handlePlayAudio = useCallback(
    (text: string) => {
      speak(text, 'fr-FR');
    },
    [speak]
  );

  const handleClearHistory = useCallback(async () => {
    if (window.confirm('Clear all translation history?')) {
      await clearHistory();
    }
  }, [clearHistory]);

  // Promote today's word into history so the Morning Brief can pick it up.
  const handleLearnedWord = useCallback(
    async (w: WordOfDayType) => {
      await saveToHistory('fr-to-en', w.word, {
        full_translation: `${w.word} (${w.pronunciation})`,
        english_meaning: w.meaning,
        breakdown: [
          { word: w.word, meaning: w.meaning, pronunciation: w.pronunciation },
        ],
      });
    },
    [saveToHistory]
  );

  const wordLearned = !!word && history.some((h) => h.source_text === word.word);

  return (
    <div className="min-h-screen w-full font-special text-[#374151]">
      <div id="app-container" className="app-container french-page mx-auto max-w-xl">
        <Header />

        <TabSwitcher tab={tab} onChange={setTab} />

        {notice && (
          <p className="mb-6 text-center text-xs tracking-[0.04em] text-[#9ca3af]">
            {notice}
          </p>
        )}

        {tab === 'word' ? (
          <WordOfDay
            word={word}
            isLoading={wordLoading}
            error={wordError}
            isAudioPlaying={isPlaying}
            learned={wordLearned}
            onPlayAudio={handlePlayAudio}
            onLearned={() => word && handleLearnedWord(word)}
            onRetry={reloadWord}
          />
        ) : (
          <>
            <TranslationInput
              mode={mode}
              isLoading={isLoading}
              value={input}
              onChange={setInput}
              onTranslate={handleTranslate}
              onGeneratePhrase={handleGeneratePhrase}
              onModeToggle={handleModeToggle}
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
              onClearHistory={handleClearHistory}
            />
          </>
        )}

        <footer className="mt-12 py-8 text-center text-[10px] uppercase tracking-[0.3em] text-[#9ca3af]/60">
          French · It’s Good To Be King
        </footer>
      </div>
    </div>
  );
}

export default App;
