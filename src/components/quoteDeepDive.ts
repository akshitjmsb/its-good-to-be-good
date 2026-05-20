/**
 * Quote deep dive — inline expander beneath the homepage life-pointer.
 *
 * - Pure DOM, delegated click handler so it survives `innerHTML` re-renders
 *   from `renderDayModule`.
 * - Per-quote content cached in Supabase (`content_cache`, content_type
 *   `quote-deep-dive`, date_key = djb2 hash of "author|quote"). Cache
 *   read/write failures degrade gracefully — the panel still renders the
 *   freshly-fetched content even if persistence is unavailable (e.g. the
 *   migration hasn't been applied yet).
 * - Plain-text-only output: AI text is escaped before injection to satisfy
 *   the architecture guard's no-unsafe-AI-HTML rule.
 */

import {
  callAI,
  hasProviderReady,
  parseJsonResponse,
} from '../infra/ai/client';
import {
  getCachedContent,
  saveCachedContent,
} from '../infra/supabase/content-cache';
import { escapeHtml } from '../utils/escapeHtml';
import type { MultilingualQuote } from './reflection';

export interface QuoteDeepDive {
  poet: string;
  context: string;
  meaning: string;
  why_it_matters: string;
}

const SECTION_LABELS: Array<{ key: keyof QuoteDeepDive; label: string }> = [
  { key: 'poet', label: 'The Poet' },
  { key: 'context', label: 'The Context' },
  { key: 'meaning', label: 'The Meaning' },
  { key: 'why_it_matters', label: 'Why It Matters' },
];

function djb2Hex(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function quoteCacheKey(quote: MultilingualQuote): string {
  return djb2Hex(`${quote.author}|${quote.quote}`);
}

function buildPrompt(quote: MultilingualQuote): string {
  const lines = [
    'You are a thoughtful literary guide. A reader is contemplating the verse below and wants a deeper understanding. Write a four-part deep dive.',
    '',
    `Original text: ${quote.quote}`,
  ];
  if (quote.transliteration) lines.push(`Transliteration: ${quote.transliteration}`);
  if (quote.translation) lines.push(`Translation: ${quote.translation}`);
  lines.push(`Author: ${quote.author}`);
  if (quote.source) lines.push(`Source: ${quote.source}`);
  lines.push(
    '',
    'Return ONLY a JSON object with these four exact keys, each holding a single plain-prose paragraph (no markdown, no asterisks, no bullet points, no quotation marks around the verse):',
    '{',
    '  "poet": "Who was the author? 2-3 sentences on their life and significance.",',
    '  "context": "When and why was this likely written? What was happening in the author\'s life or the world?",',
    '  "meaning": "A deeper reading of the verse — its metaphors, layers, and what is being said beneath the surface.",',
    '  "why_it_matters": "Why has this verse endured? What does it say about the human condition?"',
    '}',
    '',
    'Aim for 60-100 words per section. Speak with warmth and depth. Do not include the verse itself in any field.'
  );
  return lines.join('\n');
}

function isQuoteDeepDive(value: unknown): value is QuoteDeepDive {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.poet === 'string' &&
    typeof v.context === 'string' &&
    typeof v.meaning === 'string' &&
    typeof v.why_it_matters === 'string'
  );
}

async function fetchAndCache(
  userId: string,
  quote: MultilingualQuote
): Promise<QuoteDeepDive> {
  const responseText = await callAI(buildPrompt(quote), {
    temperature: 0.6,
  });
  const parsed = parseJsonResponse(responseText);
  if (!isQuoteDeepDive(parsed)) {
    throw new Error('Deep dive response missing expected sections');
  }
  try {
    await saveCachedContent(
      userId,
      'quote-deep-dive',
      quoteCacheKey(quote),
      parsed
    );
  } catch (error) {
    // Cache write failures (e.g. migration not yet applied) shouldn't
    // hide the deep dive from the reader.
    console.warn('quote-deep-dive cache write failed:', error);
  }
  return parsed;
}

export async function loadQuoteDeepDive(
  userId: string,
  quote: MultilingualQuote
): Promise<QuoteDeepDive> {
  try {
    const cached = await getCachedContent<QuoteDeepDive>(
      userId,
      'quote-deep-dive',
      quoteCacheKey(quote)
    );
    if (cached && isQuoteDeepDive(cached)) return cached;
  } catch (error) {
    console.warn('quote-deep-dive cache read failed:', error);
  }
  return fetchAndCache(userId, quote);
}

export function renderDeepDiveScaffold(): string {
  if (!hasProviderReady()) return '';
  return `
    <button type="button" class="quote-explore-toggle" aria-expanded="false" aria-controls="quote-deep-dive-panel">↓ Tap to explore</button>
    <div id="quote-deep-dive-panel" class="quote-deep-dive" hidden></div>
  `;
}

function renderLoadingState(): string {
  return `
    <div class="quote-deep-dive__loading" aria-live="polite">
      <span class="quote-deep-dive__dots" aria-hidden="true"></span>
      <span class="sr-only">Loading deep dive…</span>
    </div>
  `;
}

function renderError(message: string): string {
  return `<p class="quote-deep-dive__error">${escapeHtml(message)}</p>`;
}

function renderContent(content: QuoteDeepDive): string {
  return SECTION_LABELS.map(({ key, label }) => {
    const body = escapeHtml(content[key]).replace(/\n/g, '<br>');
    return `
      <section class="quote-deep-dive__section">
        <h4 class="quote-deep-dive__heading">${escapeHtml(label)}</h4>
        <p class="quote-deep-dive__body">${body}</p>
      </section>
    `;
  }).join('');
}

interface DeepDiveContext {
  userId: string;
  quote: MultilingualQuote;
}

let attached = false;
let currentContext: DeepDiveContext | null = null;

async function expand(panel: HTMLElement, toggle: HTMLButtonElement): Promise<void> {
  panel.hidden = false;
  // Force layout so the transition fires.
  requestAnimationFrame(() => panel.classList.add('expanded'));
  toggle.textContent = '↑ Less';
  toggle.setAttribute('aria-expanded', 'true');

  if (panel.dataset.state === 'loaded' || panel.dataset.state === 'loading') return;
  if (!currentContext) return;

  panel.dataset.state = 'loading';
  panel.innerHTML = renderLoadingState();
  try {
    const content = await loadQuoteDeepDive(currentContext.userId, currentContext.quote);
    panel.innerHTML = renderContent(content);
    panel.dataset.state = 'loaded';
  } catch (error) {
    console.error('quote-deep-dive load failed:', error);
    panel.innerHTML = renderError('Could not load the deep dive. Please try again later.');
    panel.dataset.state = 'error';
  }
}

function collapse(panel: HTMLElement, toggle: HTMLButtonElement): void {
  panel.classList.remove('expanded');
  toggle.textContent = '↓ Tap to explore';
  toggle.setAttribute('aria-expanded', 'false');
  // Hide once the transition completes so the element drops out of the
  // accessibility tree and click target.
  const onEnd = () => {
    if (!panel.classList.contains('expanded')) panel.hidden = true;
    panel.removeEventListener('transitionend', onEnd);
  };
  panel.addEventListener('transitionend', onEnd);
}

export function setActiveQuote(userId: string, quote: MultilingualQuote): void {
  const previousKey = currentContext
    ? quoteCacheKey(currentContext.quote)
    : null;
  currentContext = { userId, quote };

  // If the quote has changed (rare — only across day boundaries while the
  // tab stays open), reset the panel state so it re-loads on next expand.
  if (previousKey && previousKey !== quoteCacheKey(quote)) {
    const panel = document.getElementById('quote-deep-dive-panel');
    if (panel) {
      panel.classList.remove('expanded');
      panel.hidden = true;
      panel.innerHTML = '';
      delete panel.dataset.state;
    }
    const toggle = document.querySelector<HTMLButtonElement>('.quote-explore-toggle');
    if (toggle) {
      toggle.textContent = '↓ Tap to explore';
      toggle.setAttribute('aria-expanded', 'false');
    }
  }
}

export function attachQuoteDeepDive(): void {
  if (attached || !hasProviderReady()) return;
  const host = document.getElementById('life-pointer-display-day');
  if (!host) return;
  attached = true;

  host.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    // Clicks inside the loaded panel are content interactions, not toggles.
    if (target.closest('.quote-deep-dive')) return;
    const interactive = target.closest('.quote-explore-toggle, .quote-block');
    if (!interactive) return;

    const panel = document.getElementById(
      'quote-deep-dive-panel'
    ) as HTMLElement | null;
    const toggle = host.querySelector<HTMLButtonElement>('.quote-explore-toggle');
    if (!panel || !toggle) return;

    if (panel.classList.contains('expanded')) {
      collapse(panel, toggle);
    } else {
      void expand(panel, toggle);
    }
  });
}
