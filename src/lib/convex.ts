import { ConvexClient } from 'convex/browser';

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    'Missing VITE_CONVEX_URL. Run `npx convex dev` to provision a deployment ' +
      '(it writes CONVEX_DEPLOYMENT + VITE_CONVEX_URL into .env.local).'
  );
}

/**
 * The single browser-side Convex client, created lazily on first use.
 *
 * `new ConvexClient(url)` opens a WebSocket immediately, so we defer
 * construction until something actually reads a property off `convex`. That
 * keeps modules which merely *import* a Convex-backed helper (without calling
 * it) from opening a socket — notably the AI generators, which import the
 * content cache at module load.
 *
 * Auth is wired in `src/domains/auth/session.ts`, which calls
 * `convex.setAuth(...)` with a token fetcher backed by localStorage + the
 * Convex Auth refresh flow.
 */
let instance: ConvexClient | null = null;

function getClient(): ConvexClient {
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
