import { ConvexHttpClient } from 'convex/browser';

const convexUrl = import.meta.env.VITE_CONVEX_URL;

/**
 * The single browser-side Convex client, created lazily on first use.
 *
 * This is the HTTP client, not the WebSocket one — a deliberate downgrade.
 * The app uses Convex strictly request/response (no live queries), and the
 * WebSocket client's stateful auth handshake was the app's main bug factory
 * on iOS: a standalone PWA is suspended rather than closed, iOS kills the
 * socket, and the re-auth handshake could wedge so that queries neither
 * resolved nor rejected (the frozen-orbit "vegetable state" of July 2026).
 * With plain HTTPS requests there is no connection to lose and no handshake
 * to deadlock — each call independently succeeds or fails.
 *
 * The missing-URL check is deferred to `getClient()` — never thrown at
 * module-evaluation time. A top-level throw here would take down the *entire*
 * app bundle (this module is in the boot import graph), blanking even the
 * backend-independent UI like the quote-of-the-day and the login gate. By
 * failing only at the call site, a misconfigured deployment degrades to
 * "Convex features unavailable" instead of a dead white page. Auth and
 * persistence call sites already treat a thrown client as "no session /
 * offline" and fall back to localStorage.
 *
 * Auth is wired in `src/platform/auth/session.ts`, which attaches a fresh
 * JWT via `convex.setAuth(token)` before authenticated calls.
 */
let instance: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  if (!convexUrl) {
    throw new Error(
      'Missing VITE_CONVEX_URL. Run `npx convex dev` to provision a deployment ' +
        '(it writes CONVEX_DEPLOYMENT + VITE_CONVEX_URL into .env.local), and ' +
        'set VITE_CONVEX_URL in your hosting provider (e.g. Vercel) for builds.'
    );
  }
  if (!instance) instance = new ConvexHttpClient(convexUrl);
  return instance;
}

export const convex: ConvexHttpClient = new Proxy({} as ConvexHttpClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
