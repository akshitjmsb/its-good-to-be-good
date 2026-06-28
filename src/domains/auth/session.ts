/**
 * Auth wrappers over Convex Auth. The rest of the app never imports the Convex
 * client's auth surface directly — it goes through these helpers and the auth
 * store, which keeps the call sites identical to the old Supabase ones.
 *
 * Token model: Convex Auth's `signIn` action returns `{ token, refreshToken }`.
 * We persist both in localStorage and feed them to `convex.setAuth()` via a
 * token fetcher that transparently refreshes when Convex asks for a fresh JWT.
 *
 * Magic-link sign-in and password reset require an email provider (Resend)
 * configured in `convex/auth.ts`; until then those two helpers throw a clear,
 * descriptive error. Email + password works with no email service.
 */

import { type AuthTokenFetcher } from 'convex/browser';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthSession {
  user: AuthUser;
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

export interface AuthResult {
  user: AuthUser | null;
  session: AuthSession | null;
}

type Listener = (event: AuthChangeEvent, session: AuthSession | null) => void;

const TOKEN_KEY = 'king.convex.token';
const REFRESH_KEY = 'king.convex.refreshToken';

/* ── token storage (degrades to no-op in private mode / quota) ───────── */

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — token just won't persist across reloads */
  }
}

function storeTokens(tokens: { token: string; refreshToken: string } | null): void {
  lsSet(TOKEN_KEY, tokens?.token ?? null);
  lsSet(REFRESH_KEY, tokens?.refreshToken ?? null);
}

/* ── client auth wiring ──────────────────────────────────────────────── */

const fetchToken: AuthTokenFetcher = async ({ forceRefreshToken }) => {
  const token = lsGet(TOKEN_KEY);
  if (!forceRefreshToken) return token;

  const refreshToken = lsGet(REFRESH_KEY);
  if (!refreshToken) {
    storeTokens(null);
    return null;
  }
  try {
    const result = await convex.action(api.auth.signIn, { refreshToken });
    if (result?.tokens) {
      storeTokens(result.tokens);
      return result.tokens.token as string;
    }
  } catch (error) {
    console.error('[auth] token refresh failed:', error);
  }
  storeTokens(null);
  return null;
};

const listeners = new Set<Listener>();
let configured = false;

function onAuthChange(isAuthenticated: boolean): void {
  void emitFromServer(isAuthenticated ? 'SIGNED_IN' : 'SIGNED_OUT');
}

/** (Re)attach the token fetcher so the client picks up token changes. */
function arm(): void {
  convex.setAuth(fetchToken, onAuthChange);
  configured = true;
}

function ensureConfigured(): void {
  if (!configured) arm();
}

async function fetchSession(): Promise<AuthSession | null> {
  try {
    const user = await convex.query(api.users.currentUser, {});
    if (!user) return null;
    return { user: { id: user.id as string, email: (user.email as string | null) ?? null } };
  } catch (error) {
    console.error('[auth] currentUser query failed:', error);
    return null;
  }
}

async function emitFromServer(event: AuthChangeEvent): Promise<void> {
  const session = event === 'SIGNED_OUT' ? null : await fetchSession();
  for (const listener of listeners) listener(event, session);
}

/* ── public API (mirrors the old Supabase session helpers) ───────────── */

export async function getSession(): Promise<AuthSession | null> {
  ensureConfigured();
  if (!lsGet(TOKEN_KEY)) return null;
  return fetchSession();
}

async function passwordFlow(
  email: string,
  password: string,
  flow: 'signIn' | 'signUp'
): Promise<AuthResult> {
  ensureConfigured();
  const result = await convex.action(api.auth.signIn, {
    provider: 'password',
    params: { email, password, flow },
  });
  if (result?.tokens) storeTokens(result.tokens);
  arm(); // re-fetch the token now that it changed
  const session = await fetchSession();
  return { user: session?.user ?? null, session };
}

export function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  return passwordFlow(email, password, 'signIn');
}

export function signUpWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  return passwordFlow(email, password, 'signUp');
}

export async function signInWithMagicLink(_email: string): Promise<void> {
  throw new Error(
    'Magic-link sign-in needs an email provider (e.g. Resend) configured in ' +
      'convex/auth.ts. See CONVEX_MIGRATION_PLAN.md §4. Use email + password for now.'
  );
}

export async function resetPasswordForEmail(_email: string): Promise<void> {
  throw new Error(
    'Password reset needs an email provider (e.g. Resend) configured in ' +
      'convex/auth.ts. See CONVEX_MIGRATION_PLAN.md §4.'
  );
}

export async function signOut(): Promise<void> {
  ensureConfigured();
  try {
    await convex.action(api.auth.signOut, {});
  } catch (error) {
    console.error('[auth] signOut failed:', error);
  }
  storeTokens(null);
  arm();
  for (const listener of listeners) listener('SIGNED_OUT', null);
}

export function onAuthStateChange(callback: Listener): () => void {
  ensureConfigured();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
