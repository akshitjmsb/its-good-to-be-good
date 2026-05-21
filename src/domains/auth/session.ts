/**
 * Thin async wrappers around supabase.auth.*. The rest of the app never
 * imports `supabase.auth` directly — it goes through these helpers and the
 * auth store, which lets us mock both in tests.
 */

import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[auth] getSession failed:', error);
    return null;
  }
  return data.session;
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signUpWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signInWithMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function resetPasswordForEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}
