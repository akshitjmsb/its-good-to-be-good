import { beforeEach, describe, expect, it, vi } from 'vitest';

type AuthChangeCallback = (event: string, session: unknown) => void;

const { getSessionMock, onAuthStateChangeMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  },
}));

import {
  __resetAuthStoreForTests,
  getAuthState,
  initAuthStore,
  subscribeAuth,
} from '../store';

function makeSession(userId: string) {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_at: 0,
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: userId, email: `${userId}@example.com` },
  };
}

describe('auth store', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('hydrates to "anon" when no session is present', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    await initAuthStore();
    expect(getAuthState().status).toBe('anon');
    expect(getAuthState().user).toBeNull();
  });

  it('hydrates to "authed" when getSession returns a session', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: makeSession('abc') },
      error: null,
    });
    await initAuthStore();
    const state = getAuthState();
    expect(state.status).toBe('authed');
    expect(state.user?.id).toBe('abc');
  });

  it('reacts to onAuthStateChange events', async () => {
    let storedCb: AuthChangeCallback | undefined;
    onAuthStateChangeMock.mockImplementation((cb: AuthChangeCallback) => {
      storedCb = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
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
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    await initAuthStore();

    const listener = vi.fn();
    subscribeAuth(listener);
    storedCb?.('SIGNED_IN', makeSession('q'));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].user.id).toBe('q');
  });
});
