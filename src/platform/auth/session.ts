/**
 * Auth wrappers over Convex Auth. The rest of the app never imports the Convex
 * client's auth surface directly — it goes through these helpers and the auth
 * store, which keeps the call sites identical to the old Supabase ones.
 *
 * Token model: Convex Auth's `signIn` action returns `{ token, refreshToken }`.
 * We persist both in localStorage. The Convex client is the *HTTP* client —
 * stateless request/response, no socket, no server-driven auth handshake — so
 * this module owns token freshness explicitly: `ensureFreshAuth()` attaches
 * the stored JWT via `convex.setAuth(token)`, refreshing it first through the
 * stored refresh token when it is expired or about to expire.
 *
 * Auth events (SIGNED_IN / SIGNED_OUT) are likewise emitted from here — from
 * the sign-in and sign-out flows themselves — since with the HTTP client
 * there is no client-driven auth callback. The home's bootstrap listens for
 * these to reload into / out of the full app.
 *
 * Magic-link sign-in and password reset require an email provider (Resend)
 * configured in `convex/auth.ts`; until then those two helpers throw a clear,
 * descriptive error. Email + password works with no email service.
 */

import { convex } from '../convex/client';
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

/* ── token freshness ─────────────────────────────────────────────────── */

/**
 * Refresh the JWT this long before its actual expiry, so a request never
 * leaves with a token that dies in flight.
 */
const EXPIRY_SKEW_MS = 60_000;

/** Decode a JWT's `exp` claim (ms since epoch), or null if unreadable. */
function jwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * `true` when the stored JWT should be refreshed before use. Unreadable
 * tokens are optimistically treated as fresh — if the server disagrees, the
 * call fails and is handled at its call site — so a malformed value can't
 * trigger a refresh loop.
 */
function needsRefresh(token: string): boolean {
  const expiry = jwtExpiryMs(token);
  return expiry != null && expiry - EXPIRY_SKEW_MS <= Date.now();
}

/** `true` only when the browser positively reports being offline. */
function reportsOffline(): boolean {
  try {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  } catch {
    return false;
  }
}

/**
 * Exchange the stored refresh token for fresh tokens. Returns the new JWT,
 * or null when it couldn't. Convex Auth *throws* on a dead refresh token, so
 * the catch has to split on connectivity: offline, the failure is the
 * network's and the tokens may be fine — keep them, signing the device out
 * would trade a blip for a forced re-login. Online, the failure means the
 * refresh token is dead — clear both so the next launch goes straight to the
 * login gate instead of retrying a doomed refresh forever.
 */
async function refreshTokens(): Promise<string | null> {
  const refreshToken = lsGet(REFRESH_KEY);
  if (!refreshToken) {
    storeTokens(null);
    return null;
  }
  try {
    // Don't send the expired JWT along with the refresh call.
    convex.clearAuth();
    const result = await convex.action(api.auth.signIn, { refreshToken });
    if (result?.tokens) {
      storeTokens(result.tokens);
      return result.tokens.token as string;
    }
  } catch (error) {
    if (reportsOffline()) {
      console.error('[auth] token refresh failed offline (keeping tokens):', error);
      return null;
    }
    console.error('[auth] token refresh rejected — clearing stored tokens:', error);
  }
  storeTokens(null);
  return null;
}

/**
 * Attach a fresh JWT to the client (refreshing first if needed), or clear
 * auth when there is none. Never throws — a client construction failure
 * (e.g. missing VITE_CONVEX_URL) degrades to unauthenticated calls, which
 * every call site already treats as "no session / offline".
 */
export async function ensureFreshAuth(): Promise<void> {
  try {
    const token = lsGet(TOKEN_KEY);
    if (!token) {
      convex.clearAuth();
      return;
    }
    const fresh = needsRefresh(token) ? await refreshTokens() : token;
    if (fresh) convex.setAuth(fresh);
    else convex.clearAuth();
  } catch (error) {
    console.error('[auth] could not attach auth:', error);
  }
}

/* ── auth events ─────────────────────────────────────────────────────── */

const listeners = new Set<Listener>();

function emit(event: AuthChangeEvent, session: AuthSession | null): void {
  for (const listener of listeners) listener(event, session);
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

/* ── public API (mirrors the old Supabase session helpers) ───────────── */

/**
 * How long the boot-path session probe may wait before the device is treated
 * as signed out for this launch. With the HTTP client a slow probe means a
 * slow network — not the WebSocket-era wedged handshake — so the timeout
 * bounds the boot without touching the stored tokens.
 */
export const GET_SESSION_TIMEOUT_MS = 5_000;

export async function getSession(): Promise<AuthSession | null> {
  if (!lsGet(TOKEN_KEY)) return null;

  const timedOut = Symbol('getSession timeout');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof timedOut>(resolve => {
    timer = setTimeout(() => resolve(timedOut), GET_SESSION_TIMEOUT_MS);
  });
  const probe = ensureFreshAuth().then(fetchSession);
  try {
    const session = await Promise.race([probe, timeout]);
    if (session !== timedOut) return session;
  } finally {
    clearTimeout(timer);
  }

  console.error(
    `[auth] getSession did not settle within ${GET_SESSION_TIMEOUT_MS}ms — treating as signed out for this launch`
  );
  return null;
}

async function passwordFlow(
  email: string,
  password: string,
  flow: 'signIn' | 'signUp'
): Promise<AuthResult> {
  // Sign in from a clean slate — never send a stale JWT with the sign-in call.
  convex.clearAuth();
  const result = await convex.action(api.auth.signIn, {
    provider: 'password',
    params: { email, password, flow },
  });
  if (result?.tokens) storeTokens(result.tokens);
  await ensureFreshAuth();
  const session = await fetchSession();
  if (session) emit('SIGNED_IN', session);
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
  try {
    await ensureFreshAuth();
    await convex.action(api.auth.signOut, {});
  } catch (error) {
    console.error('[auth] signOut failed:', error);
  }
  storeTokens(null);
  try {
    convex.clearAuth();
  } catch {
    /* client unavailable — nothing to clear */
  }
  emit('SIGNED_OUT', null);
}

export function onAuthStateChange(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
