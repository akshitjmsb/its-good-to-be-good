import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Recorder = {
  selected?: { table: string; eqs: Array<[string, string]> };
  upserted?: unknown;
  upsertConflict?: string;
  selectResult?: { data: unknown; error: { code?: string } | null };
  upsertError?: { message: string } | null;
};

const recorder: Recorder = {};

function buildSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      const eqs: Array<[string, string]> = [];

      // SELECT chain
      const selectBuilder = {
        eq(col: string, value: string) {
          eqs.push([col, value]);
          return selectBuilder;
        },
        async single() {
          recorder.selected = { table, eqs };
          return recorder.selectResult ?? { data: null, error: null };
        },
      };

      return {
        select: vi.fn(() => selectBuilder),
        upsert: vi.fn(async (row: unknown, opts?: { onConflict?: string }) => {
          recorder.upserted = row;
          recorder.upsertConflict = opts?.onConflict;
          return { error: recorder.upsertError ?? null };
        }),
      };
    }),
  };
}

vi.mock('../../../lib/supabase', () => ({
  supabase: buildSupabaseMock(),
}));

import {
  getCachedContent,
  saveCachedContent,
} from '../content-cache';

beforeEach(() => {
  recorder.selected = undefined;
  recorder.upserted = undefined;
  recorder.upsertConflict = undefined;
  recorder.selectResult = { data: null, error: null };
  recorder.upsertError = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getCachedContent', () => {
  it('returns the cached content when present', async () => {
    recorder.selectResult = { data: { content: { hello: 'world' } }, error: null };
    const result = await getCachedContent('u-1', 'analytics', '2026-05-01');
    expect(result).toEqual({ hello: 'world' });
    expect(recorder.selected?.table).toBe('content_cache');
    expect(recorder.selected?.eqs).toEqual([
      ['user_id', 'u-1'],
      ['content_type', 'analytics'],
      ['date_key', '2026-05-01'],
    ]);
  });

  it('returns null on PGRST116 (row not found) without surfacing the error', async () => {
    recorder.selectResult = { data: null, error: { code: 'PGRST116' } };
    expect(await getCachedContent('u-1', 'analytics', '2026-05-01')).toBeNull();
  });
});

describe('saveCachedContent', () => {
  it('upserts with the conflict key', async () => {
    await saveCachedContent('u-1', 'analytics', '2026-05-01', { topic: 'sql' });
    const upserted = recorder.upserted as Record<string, unknown>;
    expect(upserted.user_id).toBe('u-1');
    expect(upserted.content_type).toBe('analytics');
    expect(upserted.date_key).toBe('2026-05-01');
    expect(upserted.content).toEqual({ topic: 'sql' });
    expect(recorder.upsertConflict).toBe('user_id,content_type,date_key');
  });

  it('rethrows when upsert returns an error', async () => {
    recorder.upsertError = { message: 'denied' };
    await expect(
      saveCachedContent('u-1', 'analytics', '2026-05-01', 'x')
    ).rejects.toEqual({ message: 'denied' });
  });
});
