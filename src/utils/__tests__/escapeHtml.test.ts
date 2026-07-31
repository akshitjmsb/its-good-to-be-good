import { describe, expect, it } from 'vitest';
import {
  createSafeHtml,
  escapeHtml,
  escapeHtmlAttribute,
  sanitizeInput,
  sanitizeTaskInput,
} from '../escapeHtml';

describe('escapeHtml', () => {
  it('escapes basic HTML characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('escapeHtmlAttribute', () => {
  it('escapes attributes safely', () => {
    expect(escapeHtmlAttribute('onclick="alert(1)"')).toBe(
      'onclick=&quot;alert(1)&quot;'
    );
  });
});

describe('sanitizeInput', () => {
  it('removes null bytes and control characters', () => {
    expect(sanitizeInput('test\0\x01string')).toBe('teststring');
  });

  it('limits length', () => {
    const value = 'a'.repeat(1200);
    expect(sanitizeInput(value, 1000).length).toBe(1000);
  });
});

describe('sanitizeTaskInput', () => {
  it('allows safe content', () => {
    expect(sanitizeTaskInput('Buy groceries')).toBe('Buy groceries');
  });

  it('preserves text-like markup for the escaped renderer', () => {
    expect(sanitizeTaskInput('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  });
});

describe('createSafeHtml', () => {
  it('keeps line breaks', () => {
    expect(createSafeHtml('Line 1\nLine 2')).toBe('Line 1<br>Line 2');
  });

  it('escapes HTML by default', () => {
    expect(createSafeHtml('<b>bold</b>')).toContain('&lt;b&gt;');
  });
});
