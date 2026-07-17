import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Convex client + generated api so getSession runs against spies.
const { query, action, setAuth, clearAuth } = vi.hoisted(() => ({
  query: vi.fn(),
  action: vi.fn(),
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
}));

vi.mock('../convex/client', () => ({
  convex: { query, action, setAuth, clearAuth },
}));

vi.mock('../../../convex/_generated/api', () => ({
  api: {
    users: { currentUser: 'users.currentUser' },
    auth: { signIn: 'auth.signIn', signOut: 'auth.signOut' },
  },
}));

import { GET_SESSION_TIMEOUT_MS, getSession } from './session';

const TOKEN_KEY = 'king.convex.token';
const REFRESH_KEY = 'king.convex.refreshToken';

/** Minimal localStorage stand-in (vitest runs in a node environment). */
function makeLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

/** Build a structurally-valid JWT whose `exp` is `secondsFromNow` away. */
function makeJwt(secondsFromNow: number): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow })
  ).toString('base64url');
  return `header.${payload}.signature`;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage());
  query.mockReset();
  action.mockReset();
  setAuth.mockReset();
  clearAuth.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('getSession', () => {
  it('returns null without querying when no token is stored', async () => {
    await expect(getSession()).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it('attaches the stored token and returns the session when currentUser resolves', async () => {
    // An unreadable token is optimistically treated as fresh — the server is
    // the arbiter, and its rejection surfaces at the query call site.
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(REFRESH_KEY, 'ref');
    query.mockResolvedValue({ id: 'u1', email: 'u1@example.com' });

    await expect(getSession()).resolves.toEqual({
      user: { id: 'u1', email: 'u1@example.com' },
    });
    expect(setAuth).toHaveBeenCalledWith('tok');
    expect(action).not.toHaveBeenCalled();
    // A healthy probe must not touch the stored tokens.
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');
  });

  it('proactively refreshes an expired JWT before querying', async () => {
    localStorage.setItem(TOKEN_KEY, makeJwt(-10));
    localStorage.setItem(REFRESH_KEY, 'ref');
    action.mockResolvedValue({ tokens: { token: 'fresh-tok', refreshToken: 'fresh-ref' } });
    query.mockResolvedValue({ id: 'u1', email: 'u1@example.com' });

    await expect(getSession()).resolves.toEqual({
      user: { id: 'u1', email: 'u1@example.com' },
    });
    expect(action).toHaveBeenCalledWith('auth.signIn', { refreshToken: 'ref' });
    expect(setAuth).toHaveBeenCalledWith('fresh-tok');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('fresh-tok');
    expect(localStorage.getItem(REFRESH_KEY)).toBe('fresh-ref');
  });

  it('keeps tokens when the refresh fails while offline', async () => {
    // Offline the tokens may be perfectly fine — signing the device out
    // would trade a connectivity blip for a forced re-login.
    vi.stubGlobal('navigator', { onLine: false });
    localStorage.setItem(TOKEN_KEY, makeJwt(-10));
    localStorage.setItem(REFRESH_KEY, 'ref');
    action.mockRejectedValue(new Error('network down'));
    query.mockResolvedValue(null);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getSession()).resolves.toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBe('ref');
    spy.mockRestore();
  });

  it('clears tokens when the refresh is rejected while online', async () => {
    // Convex Auth throws on a dead refresh token; online, retrying is doomed —
    // clear so the next launch goes straight to the login gate.
    vi.stubGlobal('navigator', { onLine: true });
    localStorage.setItem(TOKEN_KEY, makeJwt(-10));
    localStorage.setItem(REFRESH_KEY, 'dead-ref');
    action.mockRejectedValue(new Error('Invalid refresh token'));
    query.mockResolvedValue(null);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getSession()).resolves.toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    spy.mockRestore();
  });

  it('gives up after the timeout but keeps the stored tokens', async () => {
    // With the HTTP client a hang is just a slow network — not the
    // WebSocket-era wedged handshake — so bound the boot, keep the tokens.
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(REFRESH_KEY, 'ref');
    query.mockReturnValue(new Promise(() => {})); // never settles
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const pending = getSession();
    await vi.advanceTimersByTimeAsync(GET_SESSION_TIMEOUT_MS);

    await expect(pending).resolves.toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');
    expect(localStorage.getItem(REFRESH_KEY)).toBe('ref');
    spy.mockRestore();
  });
});
