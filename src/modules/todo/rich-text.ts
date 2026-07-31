/**
 * Small, deliberately constrained rich-text support for To Do notes.
 *
 * A note is persisted as semantic HTML, but only a short allow-list is ever
 * rendered back into the DOM. This gives the editor headings, emphasis,
 * lists, and quotations without turning task storage into an arbitrary-HTML
 * execution surface.
 */

import { escapeHtml } from '../../utils/escapeHtml';

export const NOTE_MAX_LENGTH = 100_000;

const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'H2',
  'H3',
  'BLOCKQUOTE',
  'DIV',
]);

const DROP_WITH_CONTENT = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'LINK',
  'META',
  'TEMPLATE',
  'SVG',
  'MATH',
]);

const TAG_MAP: Record<string, string> = {
  B: 'strong',
  I: 'em',
  DIV: 'p',
};

function canonicalTag(tagName: string): string {
  return TAG_MAP[tagName] ?? tagName.toLowerCase();
}

function fallbackPlainText(input: string): string {
  // The test/SSR fallback never returns source HTML. It errs toward showing
  // literal text, which is safer than trying to parse untrusted markup with a
  // regular expression.
  return input ? `<p>${escapeHtml(input)}</p>` : '';
}

/**
 * Normalise a note to the semantic elements the editor understands. All
 * attributes are stripped (including links, styles, and event handlers).
 */
export function sanitizeNoteHtml(input: string | undefined | null): string {
  const raw = typeof input === 'string' ? input : '';
  if (!raw) return '';

  if (typeof DOMParser === 'undefined') return fallbackPlainText(raw);

  const body = new DOMParser().parseFromString(raw, 'text/html').body;

  const renderNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node as Element;
    const tagName = element.tagName.toUpperCase();
    if (DROP_WITH_CONTENT.has(tagName)) return '';

    const children = Array.from(element.childNodes).map(renderNode).join('');
    if (!ALLOWED_TAGS.has(tagName)) return children;

    const tag = canonicalTag(tagName);
    if (tag === 'br') return '<br>';
    return `<${tag}>${children}</${tag}>`;
  };

  return Array.from(body.childNodes).map(renderNode).join('');
}

/** Preserve literal pasted text (including characters that look like HTML). */
export function plainTextToNoteHtml(input: string): string {
  return escapeHtml(input).replace(/\r?\n/g, '<br>');
}

/** True when a document contains visible text rather than only empty blocks. */
export function noteHasContent(note: string | undefined | null): boolean {
  if (!note) return false;
  if (typeof DOMParser === 'undefined') {
    return note.replace(/<[^>]*>/g, '').trim().length > 0;
  }
  const body = new DOMParser().parseFromString(sanitizeNoteHtml(note), 'text/html').body;
  return (body.textContent ?? '').trim().length > 0;
}

/** A calm, text-only summary suitable for metadata and accessibility copy. */
export function notePlainText(note: string | undefined | null): string {
  if (!note) return '';
  if (typeof DOMParser === 'undefined') return note.replace(/<[^>]*>/g, '').trim();
  const body = new DOMParser().parseFromString(sanitizeNoteHtml(note), 'text/html').body;
  return (body.textContent ?? '').trim();
}

/** Notes are never silently truncated: callers can preserve the last draft. */
export function isNoteWithinLimit(note: string): boolean {
  return note.length <= NOTE_MAX_LENGTH;
}
