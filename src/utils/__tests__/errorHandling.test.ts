import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { ErrorHandler, ErrorType, withErrorHandling } from '../errorHandling';

// node environment doesn't have a `document`. The error path of
// withErrorHandling calls ErrorHandler.showUserError, which reads
// document.getElementById; stub it to no-op so the wrapped function
// itself stays under test.
beforeAll(() => {
  (globalThis as unknown as { document: { getElementById: () => null } }).document = {
    getElementById: () => null,
  };
});

afterAll(() => {
  delete (globalThis as unknown as { document?: unknown }).document;
});

describe('ErrorHandler.handleApiError', () => {
  it('classifies fetch TypeErrors as NETWORK_ERROR', () => {
    const error = new TypeError('Failed to fetch');
    const result = ErrorHandler.handleApiError(error, 'context');
    expect(result.type).toBe(ErrorType.NETWORK_ERROR);
    expect(result.context).toBe('context');
    expect(result.originalError).toBe(error);
  });

  it('classifies JSON parse errors as PARSE_ERROR', () => {
    const error = new Error('Unexpected end of JSON input');
    const result = ErrorHandler.handleApiError(error);
    expect(result.type).toBe(ErrorType.PARSE_ERROR);
  });

  it('falls back to API_ERROR for generic errors', () => {
    const error = new Error('500 Internal Server Error');
    const result = ErrorHandler.handleApiError(error);
    expect(result.type).toBe(ErrorType.API_ERROR);
    expect(result.message).toBe('500 Internal Server Error');
  });

  it('attaches a numeric timestamp', () => {
    const result = ErrorHandler.handleApiError(new Error('x'));
    expect(typeof result.timestamp).toBe('number');
    expect(result.timestamp).toBeGreaterThan(0);
  });
});

describe('withErrorHandling', () => {
  it('returns the value when the wrapped fn succeeds', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await withErrorHandling(async () => 42, 'ctx');
    expect(result).toBe(42);
    errorSpy.mockRestore();
  });

  it('returns the fallback when the wrapped fn throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await withErrorHandling(
      async () => {
        throw new Error('nope');
      },
      'ctx',
      'fallback'
    );
    expect(result).toBe('fallback');
    errorSpy.mockRestore();
  });
});
