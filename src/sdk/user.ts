/**
 * User adapter. Returns DEFAULT_USER_ID today; this is where auth lookup
 * will plug in once King has real accounts.
 */

import { DEFAULT_USER_ID } from '../core/default-user';
import type { UserAdapter } from './types';

export function createUserAdapter(userId?: string): UserAdapter {
  const resolved = userId ?? DEFAULT_USER_ID;
  return {
    id() {
      return resolved;
    },
  };
}
