import { Volume2 } from 'lucide-react';
import { WordBreakdown as WordBreakdownType } from '../types';

interface WordBreakdownProps {
  breakdown: WordBreakdownType[];
  onPlayWord: (word: string) => void;
}

export function WordBreakdown({ breakdown, onPlayWord }: WordBreakdownProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {breakdown.map((item, idx) => (
        <div
          key={idx}
          className="flex justify-between items-center border-b border-black/5 pb-2"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-black text-lg">{item.word}</p>
              <button
                onClick={() => onPlayWord(item.word)}
                className="p-1 opacity-30 hover:opacity-100 transition-opacity"
              >
                <Volume2 size={14} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
              Pronounced: {item.pronunciation}
            </p>
          </div>
          <p className="text-sm italic font-medium opacity-60">{item.meaning}</p>
        </div>
      ))}
    </div>
  );
}
