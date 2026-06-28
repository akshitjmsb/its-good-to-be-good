/**
 * Reactive auth store. Hydrates from getSession() (Convex Auth) and stays
 * in sync via onAuthStateChange. The SDK user adapter reads from here, so
 * every module sees the same identity without each one wiring its own
 * subscription.
 */

import { createStore, type Store } from '../../core/store';
import {
  getSession,
  onAuthStateChange,
  type AuthSession,
  type AuthUser,
} from './session';

export type AuthStatus = 'loading' | 'authed' | 'anon';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  session: AuthSession | null;
}

const store: Store<AuthState> = createStore<AuthState>({
  status: 'loading',
  user: null,
  session: null,
});

let initialized = false;
let unsubscribe: (() => void) | null = null;

function applySession(session: AuthSession | null): void {
  store.setState({
    status: session ? 'authed' : 'anon',
    session,
    user: session?.user ?? null,
  });
}

/**
 * Boots the store. Safe to call repeatedly — only the first call hits the
 * network and subscribes; subsequent calls return the cached state.
 */
export async function initAuthStore(): Promise<AuthState> {
  if (!initialized) {
    initialized = true;
    const session = await getSession();
    applySession(session);
    unsubscribe = onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });
  }
  return store.getState();
}

export function getAuthState(): AuthState {
  return store.getState();
}

export function subscribeAuth(listener: (state: AuthState) => void): () => void {
  return store.subscribe(listener);
}

/**
 * Test-only hook to reset the singleton between tests.
 */
export function __resetAuthStoreForTests(): void {
  unsubscribe?.();
  unsubscribe = null;
  initialized = false;
  store.setState({ status: 'loading', user: null, session: null });
}
