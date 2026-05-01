import { describe, expect, it } from 'vitest';
import { parseJsonResponse } from '../client';

describe('parseJsonResponse', () => {
  it('parses plain JSON', () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips a ```json fenced block', () => {
    const text = '```json\n{"a":1,"b":[2,3]}\n```';
    expect(parseJsonResponse(text)).toEqual({ a: 1, b: [2, 3] });
  });

  it('strips a bare ``` fenced block', () => {
    const text = '```\n{"x":"y"}\n```';
    expect(parseJsonResponse(text)).toEqual({ x: 'y' });
  });

  it('falls back to extracting the first JSON object from messy text', () => {
    const text = 'Some prose before {"k":42} and trailing prose';
    expect(parseJsonResponse(text)).toEqual({ k: 42 });
  });

  it('throws when no JSON can be found', () => {
    expect(() => parseJsonResponse('definitely not json')).toThrow();
  });
});
