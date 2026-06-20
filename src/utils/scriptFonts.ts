/**
 * On-demand loader for non-Latin script fonts.
 *
 * The home page is Special Elite end-to-end; the only non-Latin text is the
 * occasional multilingual quote-of-the-day (Hindi/Urdu/Punjabi/Persian). Those
 * font families are heavy and almost never needed, so rather than block the
 * cold-start paint by loading all four families up front, we fetch the matching
 * Google Fonts stylesheet the first time a quote in that script actually
 * renders. Until then the browser falls back to the system script font.
 */

const FONT_URLS: Record<string, string> = {
  hi: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600&display=swap',
  pa: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400;600&display=swap',
  ur: 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap',
  fa: 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap',
};

const loaded = new Set<string>();

/**
 * Inject the Google Fonts stylesheet for `lang` if it isn't already present.
 * No-op for Latin scripts and for repeat calls with the same family.
 */
export function ensureScriptFont(lang: string): void {
  const url = FONT_URLS[lang];
  if (!url || loaded.has(url)) return;
  loaded.add(url);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}
