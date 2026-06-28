import { ConvexClient } from 'convex/browser';

const convexUrl = import.meta.env.VITE_CONVEX_URL;

/**
 * The single browser-side Convex client, created lazily on first use.
 *
 * `new ConvexClient(url)` opens a WebSocket immediately, so we defer
 * construction until something actually reads a property off `convex`. That
 * keeps modules which merely *import* a Convex-backed helper (without calling
 * it) from opening a socket — notably the AI generators, which import the
 * content cache at module load.
 *
 * The missing-URL check is also deferred to `getClient()` — never thrown at
 * module-evaluation time. A top-level throw here would take down the *entire*
 * app bundle (this module is in the boot import graph), blanking even the
 * backend-independent UI like the quote-of-the-day and the login gate. By
 * failing only at the call site, a misconfigured deployment degrades to
 * "Convex features unavailable" instead of a dead white page. Auth and
 * persistence call sites already treat a thrown client as "no session /
 * offline" and fall back to localStorage.
 *
 * Auth is wired in `src/domains/auth/session.ts`, which calls
 * `convex.setAuth(...)` with a token fetcher backed by localStorage + the
 * Convex Auth refresh flow.
 */
let instance: ConvexClient | null = null;

function getClient(): ConvexClient {
  if (!convexUrl) {
    throw new Error(
      'Missing VITE_CONVEX_URL. Run `npx convex dev` to provision a deployment ' +
        '(it writes CONVEX_DEPLOYMENT + VITE_CONVEX_URL into .env.local), and ' +
        'set VITE_CONVEX_URL in your hosting provider (e.g. Vercel) for builds.'
    );
  }
  if (!instance) instance = new ConvexClient(convexUrl);
  return instance;
}

export const convex: ConvexClient = new Proxy({} as ConvexClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
