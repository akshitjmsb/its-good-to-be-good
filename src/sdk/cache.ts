/**
 * Cache adapter — wraps the Supabase `content_cache` table.
 *
 * The cache is keyed by (user_id, content_type, date_key). The SDK
 * automatically scopes the content_type with the module id so two modules
 * can't collide on the same key by accident.
 */

import {
  getCachedContent,
  saveCachedContent,
  type CachedContentType,
} from '../infra/supabase/content-cache';
import type { CacheAdapter, UserAdapter } from './types';

export function createCacheAdapter(
  moduleId: string,
  user: UserAdapter
): CacheAdapter {
  function scope(contentType: string): CachedContentType {
    // The underlying type is a string union we widen at the call site.
    return `${moduleId}:${contentType}` as CachedContentType;
  }

  return {
    get<T>(contentType: string, dateKey: string) {
      return getCachedContent<T>(user.id(), scope(contentType), dateKey);
    },
    set<T>(contentType: string, dateKey: string, content: T) {
      return saveCachedContent<T>(user.id(), scope(contentType), dateKey, content);
    },
  };
}
