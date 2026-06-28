/**
 * Convex content cache. Signatures unchanged from the old Supabase module; the
 * `userId` parameter is vestigial (identity comes from the auth context) but is
 * kept so callers — the SDK cache adapter, quote deep-dive, French word-of-day,
 * generators — don't change.
 */

import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';

export type CachedContentType =
  | 'archive'
  | 'analytics'
  | 'transportation-physics'
  | 'quote-deep-dive'
  | 'french-word-of-day';

export async function getCachedContent<T>(
  _userId: string,
  contentType: CachedContentType,
  dateKey: string
): Promise<T | null> {
  try {
    const content = await convex.query(api.contentCache.get, {
      contentType,
      dateKey,
    });
    return (content as T) ?? null;
  } catch (error) {
    console.error('Error getting cached content:', error);
    return null;
  }
}

export async function saveCachedContent<T>(
  _userId: string,
  contentType: CachedContentType,
  dateKey: string,
  content: T
): Promise<void> {
  try {
    await convex.mutation(api.contentCache.set, {
      contentType,
      dateKey,
      content,
    });
  } catch (error) {
    console.error('Error saving cached content:', error);
    throw error;
  }
}
