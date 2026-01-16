import { ArrowLeftRight, Trash2, Home } from 'lucide-react';
import { TranslationMode } from '../types';

interface HeaderProps {
  mode: TranslationMode;
  onModeToggle: () => void;
  onClearHistory: () => void;
}

export function Header({ mode, onModeToggle, onClearHistory }: HeaderProps) {
  return (
    <header className="w-full max-w-xl flex justify-between items-center mb-8 border-b-4 border-black pb-4">
      <div className="flex items-center gap-4">
        <a
          href="index.html"
          className="p-2 border-2 border-transparent hover:border-black transition-all"
          title="Back to Dashboard"
        >
          <Home size={18} />
        </a>
        <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase">
          {mode === 'en-to-fr' ? 'EN \u2192 FR' : 'FR \u2192 EN'}
        </h1>
        <button
          onClick={onModeToggle}
          className="p-2 border-2 border-transparent hover:border-black transition-all"
          title="Switch translation direction"
        >
          <ArrowLeftRight size={18} />
        </button>
      </div>
      <button
        onClick={onClearHistory}
        className="p-2 opacity-30 hover:opacity-100 transition-opacity"
        title="Clear history"
      >
        <Trash2 size={18} />
      </button>
    </header>
  );
}
