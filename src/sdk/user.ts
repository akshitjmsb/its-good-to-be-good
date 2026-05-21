/**
 * User adapter. Reads identity from the auth store so modules see the
 * authenticated user — or throw cleanly when no session is present.
 *
 * The `userId` override exists for tests; production code never sets it.
 */

import { getAuthState, subscribeAuth } from '../domains/auth/store';
import type { UserAdapter } from './types';

export function createUserAdapter(userIdOverride?: string): UserAdapter {
  if (userIdOverride !== undefined) {
    return {
      id: () => userIdOverride,
      email: () => null,
      isAuthenticated: () => true,
      subscribe: () => () => undefined,
    };
  }

  return {
    id() {
      const { user } = getAuthState();
      if (!user) {
        throw new Error(
          '[king-sdk] No authenticated user. The shell should gate module ' +
            'init on an authed session.'
        );
      }
      return user.id;
    },
    email() {
      return getAuthState().user?.email ?? null;
    },
    isAuthenticated() {
      return getAuthState().status === 'authed';
    },
    subscribe(listener) {
      return subscribeAuth(() => listener());
    },
  };
}
