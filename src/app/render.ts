import { renderTasks } from '../components/tasks';
import { MultilingualQuote } from '../components/reflection';
import { Task } from '../types';

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
  return `
    <div class="quote-original ${isMultilingual ? 'multilingual' : ''}" lang="${quote.language}">
      "${quote.quote}"
    </div>
    ${quote.transliteration ? `<div class="quote-transliteration">${quote.transliteration}</div>` : ''}
    ${quote.translation ? `<div class="quote-translation">"${quote.translation}"</div>` : ''}
    <div class="quote-author">— ${quote.author}</div>
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

  const reflectionPromptEl = document.getElementById(
    'reflection-prompt-display-day'
  );
  if (reflectionPromptEl) reflectionPromptEl.textContent = '';

  renderTasks(tasks, 'tasks-list-day');
}
