/**
 * One-shot legacy-data claim. The pre-auth era tagged every row with the
 * anonymous UUID (00000000-...). When the first real user signs in we
 * reattribute those rows to their auth.uid() via a SECURITY DEFINER RPC.
 *
 * The RPC itself is gated by a single-row state table so it can only run
 * once across the whole project. We also keep a localStorage flag so we
 * don't keep poking the network on every sign-in.
 */

import { supabase } from '../../lib/supabase';

const CLAIMED_KEY = 'auth.legacy-claimed';

export function hasClaimedLegacyData(): boolean {
  try {
    return localStorage.getItem(CLAIMED_KEY) === 'true';
  } catch {
    return false;
  }
}

function markClaimed(): void {
  try {
    localStorage.setItem(CLAIMED_KEY, 'true');
  } catch {
    // Private mode / quota — swallow; the server-side state table is the
    // authoritative guard.
  }
}

/**
 * Calls the `claim_legacy_data` RPC. Idempotent server-side: subsequent
 * calls after the initial claim return a "already_claimed" result rather
 * than touching any rows. Safe to invoke on every sign-in if the local
 * flag is missing.
 */
export async function claimLegacyDataIfNeeded(): Promise<void> {
  if (hasClaimedLegacyData()) return;

  const { error } = await supabase.rpc('claim_legacy_data');
  if (error) {
    // Not fatal — the user just won't see their pre-auth data. Log and
    // leave the flag unset so a retry can happen next session.
    console.warn('[auth] claim_legacy_data RPC failed:', error.message);
    return;
  }

  markClaimed();
}
