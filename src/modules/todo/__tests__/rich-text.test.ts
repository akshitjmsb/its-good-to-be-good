import { describe, expect, it } from 'vitest';
import {
  isNoteWithinLimit,
  noteHasContent,
  plainTextToNoteHtml,
  sanitizeNoteHtml,
  NOTE_MAX_LENGTH,
} from '../rich-text';

describe('note rich text safety', () => {
  it('preserves literal text that happens to look like markup', () => {
    expect(plainTextToNoteHtml('<script>keep this as text</script>')).toBe(
      '&lt;script&gt;keep this as text&lt;&#x2F;script&gt;'
    );
  });

  it('never reports an empty document as a note', () => {
    expect(noteHasContent('')).toBe(false);
    expect(noteHasContent('<br>')).toBe(false);
  });

  it('does not silently accept a document above the configured safe limit', () => {
    expect(isNoteWithinLimit('x'.repeat(NOTE_MAX_LENGTH))).toBe(true);
    expect(isNoteWithinLimit('x'.repeat(NOTE_MAX_LENGTH + 1))).toBe(false);
  });

  it('returns a safe text representation without a DOM implementation', () => {
    // Vitest runs in node, so this covers the SSR/test fallback as well.
    expect(sanitizeNoteHtml('<img src=x onerror=alert(1)>')).toContain('&lt;img');
  });
});
