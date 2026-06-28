import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '../session';

type AuthChangeCallback = (event: string, session: AuthSession | null) => void;

// The store hydrates from the session helpers; mock those directly so the test
// never touches the Convex client.
const { getSessionMock, onAuthStateChangeMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
}));

vi.mock('../session', () => ({
  getSession: getSessionMock,
  onAuthStateChange: onAuthStateChangeMock,
}));

import {
  __resetAuthStoreForTests,
  getAuthState,
  initAuthStore,
  subscribeAuth,
} from '../store';

function makeSession(userId: string): AuthSession {
  return { user: { id: userId, email: `${userId}@example.com` } };
}

describe('auth store', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    onAuthStateChangeMock.mockReturnValue(vi.fn());
  });

  it('hydrates to "anon" when no session is present', async () => {
    getSessionMock.mockResolvedValue(null);
    await initAuthStore();
    expect(getAuthState().status).toBe('anon');
    expect(getAuthState().user).toBeNull();
  });

  it('hydrates to "authed" when getSession returns a session', async () => {
    getSessionMock.mockResolvedValue(makeSession('abc'));
    await initAuthStore();
    const state = getAuthState();
    expect(state.status).toBe('authed');
    expect(state.user?.id).toBe('abc');
  });

  it('reacts to onAuthStateChange events', async () => {
    let storedCb: AuthChangeCallback | undefined;
    onAuthStateChangeMock.mockImplementation((cb: AuthChangeCallback) => {
      storedCb = cb;
      return vi.fn();
    });
    getSessionMock.mockResolvedValue(null);
    await initAuthStore();
    expect(getAuthState().status).toBe('anon');

    storedCb?.('SIGNED_IN', makeSession('xyz'));
    expect(getAuthState().status).toBe('authed');
    expect(getAuthState().user?.id).toBe('xyz');

    storedCb?.('SIGNED_OUT', null);
    expect(getAuthState().status).toBe('anon');
  });

  it('notifies subscribers on every transition', async () => {
    let storedCb: AuthChangeCallback | undefined;
    onAuthStateChangeMock.mockImplementation((cb: AuthChangeCallback) => {
      storedCb = cb;
      return vi.fn();
    });
    getSessionMock.mockResolvedValue(null);
    await initAuthStore();

    const listener = vi.fn();
    subscribeAuth(listener);
    storedCb?.('SIGNED_IN', makeSession('q'));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].user.id).toBe('q');
  });
});
