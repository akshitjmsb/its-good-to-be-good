/**
 * DB adapter — exposes the raw Supabase client.
 *
 * Modules should namespace their own tables (typically with a module-id
 * prefix). The SDK doesn't gate which tables they touch — that's the
 * database's RLS layer's job.
 */

import { supabase } from '../lib/supabase';
import type { DBAdapter } from './types';

export function createDBAdapter(): DBAdapter {
  return {
    client() {
      return supabase;
    },
  };
}
