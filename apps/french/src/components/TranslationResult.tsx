import { Volume2, Loader2, ArrowRight, Info } from 'lucide-react';
import { TranslationResponse, TranslationMode } from '../types';
import { WordBreakdown } from './WordBreakdown';

interface TranslationResultProps {
  result: TranslationResponse;
  mode: TranslationMode;
  isAudioPlaying: boolean;
  onPlayAudio: (text: string) => void;
}

export function TranslationResult({
  result,
  mode,
  isAudioPlaying,
  onPlayAudio
}: TranslationResultProps) {
  return (
    <section className="w-full max-w-xl mb-12 animate-in">
      <div className="border-4 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-between items-start mb-4">
          <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-1">
            {mode === 'en-to-fr' ? 'Translation' : 'French Analysis'}
          </span>
          <button
            onClick={() => onPlayAudio(result.full_translation)}
            className={`p-4 rounded-full border-4 border-black transition-all ${
              isAudioPlaying
                ? 'bg-gray-100'
                : 'bg-white hover:bg-black hover:text-white active:scale-95'
            }`}
            disabled={isAudioPlaying}
          >
            {isAudioPlaying ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <Volume2 size={24} />
            )}
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-3xl md:text-4xl font-black leading-tight mb-2">
            {result.full_translation}
          </h2>
          <div className="opacity-40 text-sm font-bold flex items-center gap-2">
            <ArrowRight size={14} />
            <span>{result.english_meaning}</span>
          </div>
        </div>

        {result.breakdown && result.breakdown.length > 0 && (
          <div className="border-t-2 border-black pt-6 mt-6">
            <div className="flex items-center gap-2 mb-4 opacity-30">
              <Info size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">
                Word Breakdown
              </h3>
            </div>
            <WordBreakdown
              breakdown={result.breakdown}
              onPlayWord={(word) => onPlayAudio(word)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
