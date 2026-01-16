import React from 'react';
import { MultilingualQuote } from '../reflection';

interface PhilosophicalQuoteProps {
  quote: MultilingualQuote;
}

export const PhilosophicalQuote: React.FC<PhilosophicalQuoteProps> = ({ quote }) => {
  const isMultilingual = quote.language !== 'en' && (quote.transliteration || quote.translation);

  return (
    <div className="life-pointer">
      <div className={`quote-original ${isMultilingual ? 'multilingual' : ''}`} lang={quote.language}>
        "{quote.quote}"
      </div>
      {quote.transliteration && (
        <div className="quote-transliteration">
          {quote.transliteration}
        </div>
      )}
      {quote.translation && (
        <div className="quote-translation">
          "{quote.translation}"
        </div>
      )}
      <div className="quote-author">— {quote.author}</div>
    </div>
  );
};

// Legacy component for backward compatibility
interface LegacyPhilosophicalQuoteProps {
  quote: string;
  author: string;
}

export const LegacyPhilosophicalQuote: React.FC<LegacyPhilosophicalQuoteProps> = ({ quote, author }) => {
  return (
    <div className="life-pointer">
      <div className="quote-text">"{quote}"</div>
      <div className="quote-author">— {author}</div>
    </div>
  );
};
