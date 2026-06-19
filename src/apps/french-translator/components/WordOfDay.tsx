import { Volume2, Loader2, Check, RotateCw } from 'lucide-react';
import { WordOfDay as WordOfDayType } from '../types';

interface WordOfDayProps {
  word: WordOfDayType | null;
  isLoading: boolean;
  error: string | null;
  isAudioPlaying: boolean;
  learned: boolean;
  onPlayAudio: (text: string) => void;
  onLearned: () => void;
  onRetry: () => void;
}

const CARD =
  'w-full rounded-xl border border-[#e5e7eb] bg-white p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)]';

function SpeakerButton({
  onClick,
  playing,
  size = 18,
  label,
}: {
  onClick: () => void;
  playing: boolean;
  size?: number;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white p-2 text-[#6b7280] transition-all duration-200 hover:-translate-y-px hover:text-[#374151] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40"
    >
      {playing ? (
        <Loader2 className="animate-spin" size={size} />
      ) : (
        <Volume2 size={size} />
      )}
    </button>
  );
}

export function WordOfDay({
  word,
  isLoading,
  error,
  isAudioPlaying,
  learned,
  onPlayAudio,
  onLearned,
  onRetry,
}: WordOfDayProps) {
  if (isLoading) {
    return (
      <div className={`${CARD} animate-pulse`}>
        <div className="mx-auto mb-6 h-3 w-28 rounded bg-[#f8f9fa]" />
        <div className="mx-auto mb-4 h-10 w-48 rounded bg-[#f8f9fa]" />
        <div className="mx-auto mb-8 h-3 w-32 rounded bg-[#f8f9fa]" />
        <div className="space-y-3">
          <div className="h-3 w-full rounded bg-[#f8f9fa]" />
          <div className="h-3 w-5/6 rounded bg-[#f8f9fa]" />
          <div className="h-3 w-4/6 rounded bg-[#f8f9fa]" />
        </div>
      </div>
    );
  }

  if (error || !word) {
    return (
      <div className={`${CARD} text-center`}>
        <p className="mb-4 text-sm text-[#6b7280]">
          {error || 'No word available right now.'}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-xs tracking-[0.04em] text-[#374151] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40"
        >
          <RotateCw size={14} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <p className="mb-6 text-center text-[10px] uppercase tracking-[0.12em] text-[#9ca3af]">
        Word of the Day
      </p>

      {/* The word — large, centered, like a typewriter stamp */}
      <div className="mb-3 flex flex-col items-center gap-3 text-center">
        <h2 className="text-4xl md:text-5xl leading-tight text-[#111111]">
          {word.word}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#6b7280]">{word.pronunciation}</span>
          <SpeakerButton
            onClick={() => onPlayAudio(word.word)}
            playing={isAudioPlaying}
            label={`Pronounce ${word.word}`}
          />
        </div>
      </div>

      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <p className="text-lg text-[#374151]">{word.meaning}</p>
        {word.grammar && (
          <span className="rounded-full border border-[#e5e7eb] bg-[#f8f9fa] px-3 py-0.5 text-[11px] tracking-[0.04em] text-[#6b7280]">
            {word.grammar}
          </span>
        )}
      </div>

      {/* Examples */}
      {word.examples?.length > 0 && (
        <div className="border-t border-[#e5e7eb] pt-5">
          <p className="mb-3 text-[10px] uppercase tracking-[0.12em] text-[#9ca3af]">
            In context
          </p>
          <ul className="space-y-4">
            {word.examples.map((ex, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-[#374151]">{ex.french}</p>
                  <p className="text-sm text-[#6b7280]">{ex.english}</p>
                </div>
                <SpeakerButton
                  onClick={() => onPlayAudio(ex.french)}
                  playing={false}
                  size={14}
                  label="Play sentence"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cultural note */}
      {word.note && (
        <div className="mt-6 rounded-lg border border-[#e5e7eb] bg-[#f8f9fa] p-4">
          <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[#9ca3af]">
            Did you know
          </p>
          <p className="text-sm text-[#6b7280]">{word.note}</p>
        </div>
      )}

      {/* I learned this */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={onLearned}
          disabled={learned}
          className={[
            'inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs tracking-[0.04em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40',
            learned
              ? 'cursor-default border border-[#e5e7eb] bg-[#f8f9fa] text-[#9ca3af]'
              : 'border border-[#d1d5db] bg-white text-[#374151] hover:-translate-y-px hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)]',
          ].join(' ')}
        >
          <Check size={14} />
          {learned ? 'Learned' : 'I learned this'}
        </button>
      </div>
    </div>
  );
}
