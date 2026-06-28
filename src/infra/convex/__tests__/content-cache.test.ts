import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { query, mutation } = vi.hoisted(() => ({
  query: vi.fn(),
  mutation: vi.fn(),
}));

vi.mock('../../../lib/convex', () => ({
  convex: { query, mutation },
}));

vi.mock('../../../../convex/_generated/api', () => ({
  api: {
    contentCache: { get: 'contentCache.get', set: 'contentCache.set' },
  },
}));

import { getCachedContent, saveCachedContent } from '../content-cache';

beforeEach(() => {
  query.mockReset();
  mutation.mockReset();
  mutation.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getCachedContent', () => {
  it('returns the cached content when present', async () => {
    query.mockResolvedValue({ hello: 'world' });
    const result = await getCachedContent('u-1', 'analytics', '2026-05-01');
    expect(result).toEqual({ hello: 'world' });
    expect(query).toHaveBeenCalledWith('contentCache.get', {
      contentType: 'analytics',
      dateKey: '2026-05-01',
    });
  });

  it('returns null when the row is missing', async () => {
    query.mockResolvedValue(null);
    expect(await getCachedContent('u-1', 'analytics', '2026-05-01')).toBeNull();
  });

  it('returns null (degrades gracefully) when the query throws', async () => {
    query.mockRejectedValue(new Error('offline'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await getCachedContent('u-1', 'analytics', '2026-05-01')).toBeNull();
    spy.mockRestore();
  });
});

describe('saveCachedContent', () => {
  it('writes via the set mutation', async () => {
    await saveCachedContent('u-1', 'analytics', '2026-05-01', { topic: 'sql' });
    expect(mutation).toHaveBeenCalledWith('contentCache.set', {
      contentType: 'analytics',
      dateKey: '2026-05-01',
      content: { topic: 'sql' },
    });
  });

  it('rethrows when the mutation fails', async () => {
    mutation.mockRejectedValue(new Error('denied'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      saveCachedContent('u-1', 'analytics', '2026-05-01', 'x')
    ).rejects.toThrow('denied');
    spy.mockRestore();
  });
});
