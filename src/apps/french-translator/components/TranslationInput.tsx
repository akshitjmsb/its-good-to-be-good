import { FormEvent } from 'react';
import { ArrowRight, Loader2, Sparkles, ArrowLeftRight } from 'lucide-react';
import { TranslationMode } from '../types';

interface TranslationInputProps {
  mode: TranslationMode;
  isLoading: boolean;
  value: string;
  onChange: (text: string) => void;
  onTranslate: (text: string) => void;
  onGeneratePhrase: () => void;
  onModeToggle: () => void;
}

export function TranslationInput({
  mode,
  isLoading,
  value,
  onChange,
  onTranslate,
  onGeneratePhrase,
  onModeToggle,
}: TranslationInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onTranslate(value.trim());
    }
  };

  return (
    <section className="mb-8 space-y-4">
      {/* Direction toggle — reads as a quiet line of journal metadata */}
      <div className="flex justify-center">
        <button
          onClick={onModeToggle}
          className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-[#f8f9fa] px-4 py-1.5 text-xs tracking-[0.04em] text-[#6b7280] transition-all duration-200 hover:text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40"
          title="Switch translation direction"
        >
          <span>{mode === 'en-to-fr' ? 'English' : 'Français'}</span>
          <ArrowLeftRight size={14} />
          <span>{mode === 'en-to-fr' ? 'Français' : 'English'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === 'en-to-fr' ? 'English…' : 'Français…'}
          className="w-full rounded-xl border border-[#d1d5db] bg-white p-4 pr-14 text-base text-[#374151] shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 placeholder:text-[#9ca3af] focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          aria-label="Translate"
          className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-[#e5e7eb] bg-white p-2 text-[#374151] transition-all duration-200 hover:-translate-y-1/2 hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)] disabled:opacity-30 disabled:shadow-none"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <ArrowRight size={20} />
          )}
        </button>
      </form>

      <button
        onClick={onGeneratePhrase}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-[#f8f9fa] py-2.5 text-xs tracking-[0.04em] text-[#6b7280] transition-all duration-200 hover:-translate-y-px hover:text-[#374151] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40 disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        <Sparkles size={14} />
        Generate a simple phrase
      </button>
    </section>
  );
}
