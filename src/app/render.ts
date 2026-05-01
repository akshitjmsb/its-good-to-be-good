import { renderTasks } from '../components/tasks';
import { MultilingualQuote } from '../components/reflection';
import { renderDeepDiveScaffold } from '../components/quoteDeepDive';
import { Task } from '../types';
import { escapeHtml } from '../utils/escapeHtml';

export function updateDynamicIcon(): void {
  const iconEl = document.getElementById(
    'dynamic-time-icon'
  ) as HTMLElement | null;
  if (!iconEl) return;

  iconEl.textContent = '✨';
  iconEl.className = 'theme-icon';
}

export function renderQuoteHTML(quote: MultilingualQuote): string {
  const isMultilingual =
    quote.language !== 'en' && (quote.transliteration || quote.translation);
  const language = ['en', 'hi', 'ur', 'pa', 'fa'].includes(quote.language)
    ? quote.language
    : 'en';
  const safeQuote = escapeHtml(quote.quote).replace(/\n/g, '<br>');
  const safeTransliteration = quote.transliteration
    ? escapeHtml(quote.transliteration).replace(/\n/g, '<br>')
    : '';
  const safeTranslation = quote.translation
    ? escapeHtml(quote.translation).replace(/\n/g, '<br>')
    : '';
  const safeAuthor = escapeHtml(quote.author);
  const safeSource = quote.source ? escapeHtml(quote.source) : '';

  return `
    <div class="quote-block">
      <div class="quote-original ${isMultilingual ? 'multilingual' : ''}" lang="${language}">
        "${safeQuote}"
      </div>
      ${safeTransliteration ? `<div class="quote-transliteration">${safeTransliteration}</div>` : ''}
      ${safeTranslation ? `<div class="quote-translation">"${safeTranslation}"</div>` : ''}
      <div class="quote-author">— ${safeAuthor}${safeSource ? ` · ${safeSource}` : ''}</div>
    </div>
    ${renderDeepDiveScaffold()}
  `;
}

export function renderDayModule(
  quote: MultilingualQuote | null,
  tasks: Task[]
): void {
  const lifePointerEl = document.getElementById('life-pointer-display-day');
  if (lifePointerEl && quote) {
    lifePointerEl.innerHTML = renderQuoteHTML(quote);
  }

  renderTasks(tasks, 'tasks-list-day');
}
