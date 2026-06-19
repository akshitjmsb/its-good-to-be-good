import { Volume2 } from 'lucide-react';
import { WordBreakdown as WordBreakdownType } from '../types';

interface WordBreakdownProps {
  breakdown: WordBreakdownType[];
  onPlayWord: (word: string) => void;
}

export function WordBreakdown({ breakdown, onPlayWord }: WordBreakdownProps) {
  return (
    <ul className="space-y-3">
      {breakdown.map((item, idx) => (
        <li
          key={idx}
          className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] pb-3 last:border-b-0 last:pb-0"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-lg text-[#374151]">{item.word}</p>
              <button
                onClick={() => onPlayWord(item.word)}
                aria-label={`Pronounce ${item.word}`}
                className="p-1 text-[#9ca3af] transition-colors duration-200 hover:text-[#374151]"
              >
                <Volume2 size={14} />
              </button>
            </div>
            <p className="text-[11px] uppercase tracking-[0.04em] text-[#9ca3af]">
              {item.pronunciation}
            </p>
          </div>
          <p className="text-sm text-[#6b7280]">{item.meaning}</p>
        </li>
      ))}
    </ul>
  );
}
