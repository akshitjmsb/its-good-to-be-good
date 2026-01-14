import { Volume2 } from 'lucide-react';
import { HistoryEntry } from '../types';

interface HistoryListProps {
  history: HistoryEntry[];
  onSelectEntry: (entry: HistoryEntry) => void;
  onPlayAudio: (text: string) => void;
}

export function HistoryList({ history, onSelectEntry, onPlayAudio }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <section className="w-full max-w-xl flex-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-20 mb-4">
          History
        </h3>
        <p className="text-center text-gray-300 text-sm">
          No translations yet. Start translating!
        </p>
      </section>
    );
  }

  return (
    <section className="w-full max-w-xl flex-1">
      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-20 mb-4">
        History
      </h3>
      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="border-2 border-black p-3 flex items-center gap-4 bg-white hover:bg-gray-50 transition-colors"
          >
            <div
              className="flex-1 cursor-pointer"
              onClick={() => onSelectEntry(item)}
            >
              <p className="font-bold text-sm">{item.translation}</p>
              <p className="text-[10px] opacity-40 uppercase truncate tracking-tight">
                "{item.meaning}"
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayAudio(item.translation);
              }}
              className="p-2 border-2 border-transparent hover:border-black rounded-full transition-all"
            >
              <Volume2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
