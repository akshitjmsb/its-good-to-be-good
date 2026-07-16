import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Convex client + generated api so getSession runs against spies.
const { query, action, setAuth } = vi.hoisted(() => ({
  query: vi.fn(),
  action: vi.fn(),
  setAuth: vi.fn(),
}));

vi.mock('../convex/client', () => ({
  convex: { query, action, setAuth },
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

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage());
  vi.stubGlobal('navigator', { onLine: true });
  query.mockReset();
  action.mockReset();
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

  it('returns the session when currentUser resolves', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(REFRESH_KEY, 'ref');
    query.mockResolvedValue({ id: 'u1', email: 'u1@example.com' });

    await expect(getSession()).resolves.toEqual({
      user: { id: 'u1', email: 'u1@example.com' },
    });
    // A healthy probe must not touch the stored tokens.
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');
  });

  it('gives up after the timeout and clears tokens when the probe hangs online', async () => {
    localStorage.setItem(TOKEN_KEY, 'stale');
    localStorage.setItem(REFRESH_KEY, 'stale-refresh');
    query.mockReturnValue(new Promise(() => {})); // never settles (wedged handshake)

    const pending = getSession();
    await vi.advanceTimersByTimeAsync(GET_SESSION_TIMEOUT_MS);

    await expect(pending).resolves.toBeNull();
    // Self-heal: the wedging tokens are gone, so the next launch mounts the
    // login gate instead of hanging again.
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it('keeps tokens when the probe times out offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(REFRESH_KEY, 'ref');
    query.mockReturnValue(new Promise(() => {}));

    const pending = getSession();
    await vi.advanceTimersByTimeAsync(GET_SESSION_TIMEOUT_MS);

    await expect(pending).resolves.toBeNull();
    // Offline the tokens may be perfectly fine — signing the device out
    // would trade a connectivity blip for a forced re-login.
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');
    expect(localStorage.getItem(REFRESH_KEY)).toBe('ref');
  });
});
