import { Volume2, Loader2, ArrowRight } from 'lucide-react';
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
  onPlayAudio,
}: TranslationResultProps) {
  return (
    <section className="mb-10">
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#9ca3af]">
            {mode === 'en-to-fr' ? 'Translation' : 'French analysis'}
          </span>
          <button
            onClick={() => onPlayAudio(result.full_translation)}
            aria-label="Play translation"
            disabled={isAudioPlaying}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white p-2.5 text-[#374151] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40 disabled:opacity-50"
          >
            {isAudioPlaying ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Volume2 size={20} />
            )}
          </button>
        </div>

        <div className="mb-6">
          <h2 className="mb-2 text-2xl md:text-3xl leading-tight text-[#111111]">
            {result.full_translation}
          </h2>
          <div className="flex items-center gap-2 text-sm text-[#6b7280]">
            <ArrowRight size={14} />
            <span>{result.english_meaning}</span>
          </div>
        </div>

        {result.breakdown && result.breakdown.length > 0 && (
          <div className="border-t border-[#e5e7eb] pt-5">
            <p className="mb-4 text-[10px] uppercase tracking-[0.12em] text-[#9ca3af]">
              Word breakdown
            </p>
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
