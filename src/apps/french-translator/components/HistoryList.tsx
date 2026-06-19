import { Volume2, Trash2 } from 'lucide-react';
import { HistoryEntry } from '../types';

interface HistoryListProps {
  history: HistoryEntry[];
  onSelectEntry: (entry: HistoryEntry) => void;
  onPlayAudio: (text: string) => void;
  onClearHistory: () => void;
}

export function HistoryList({
  history,
  onSelectEntry,
  onPlayAudio,
  onClearHistory,
}: HistoryListProps) {
  return (
    <section className="flex-1">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-[0.12em] text-[#9ca3af]">
          History
        </h3>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            aria-label="Clear history"
            className="p-1.5 text-[#9ca3af] transition-colors duration-200 hover:text-[#ef4444] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40 rounded-full"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-center text-sm text-[#9ca3af]">
          No translations yet. Start translating!
        </p>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)]"
            >
              <button
                type="button"
                className="flex-1 cursor-pointer text-left"
                onClick={() => onSelectEntry(item)}
              >
                <p className="text-sm text-[#374151]">{item.translation}</p>
                <p className="truncate text-[11px] text-[#9ca3af]">
                  {item.meaning}
                </p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayAudio(item.translation);
                }}
                aria-label="Play"
                className="rounded-full p-2 text-[#9ca3af] transition-colors duration-200 hover:text-[#374151]"
              >
                <Volume2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
