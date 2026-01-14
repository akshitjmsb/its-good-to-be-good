import { useState, FormEvent } from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { TranslationMode } from '../types';

interface TranslationInputProps {
  mode: TranslationMode;
  isLoading: boolean;
  onTranslate: (text: string) => void;
  onGeneratePhrase: () => void;
}

export function TranslationInput({
  mode,
  isLoading,
  onTranslate,
  onGeneratePhrase
}: TranslationInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onTranslate(input.trim());
      setInput('');
    }
  };

  return (
    <section className="w-full max-w-xl mb-8 space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'en-to-fr' ? 'English...' : 'Fran\u00e7ais...'}
          className="w-full border-4 border-black p-5 pr-14 text-lg focus:outline-none placeholder:text-gray-300"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 disabled:opacity-30"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <ArrowRight size={28} strokeWidth={3} />
          )}
        </button>
      </form>
      <button
        onClick={onGeneratePhrase}
        disabled={isLoading}
        className="w-full border-2 border-black p-3 text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-all disabled:opacity-30"
      >
        <Sparkles className="w-3 h-3" />
        Generate Simple Phrase
      </button>
    </section>
  );
}
