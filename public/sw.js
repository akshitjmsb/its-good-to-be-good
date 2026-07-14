/*
 * Self-destroying service worker.
 *
 * This app used to precache its shell with a Workbox service worker. On
 * installed iOS/Safari PWAs that turned into a trap: a standalone PWA is
 * suspended rather than closed, so its worker rarely updates, and every device
 * kept serving whatever shell it had cached — including old, broken shells
 * that no deploy could reach. Each attempted fix lived in the shell's JS, which
 * can't run while the old worker is still serving the old shell.
 *
 * So this worker does exactly one thing: remove itself and everything the old
 * worker cached, then reload every open page to a fresh, network-served shell.
 * The delivery path survives the trap because the browser fetches sw.js
 * DIRECTLY (bypassing the HTTP cache for the worker script), so whatever old
 * worker a device has, its next update check installs THIS worker. `skipWaiting`
 * makes it activate immediately even on a suspended standalone PWA that never
 * closes its pages.
 *
 * After this runs, the origin has no service worker and no caches. The rebuilt
 * app registers nothing, so launches load current code straight from the CDN
 * and the stale-shell class of bug cannot recur.
 */

self.addEventListener('install', () => {
  // Activate now — do not wait for existing pages to close. iOS standalone
  // PWAs suspend instead of closing, so waiting would mean never activating.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Take control of any pages the outgoing worker was serving, so we can
      // reload them below.
      await self.clients.claim();

      // Delete every cache this origin holds (old precached shells and all).
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));

      // Unregister this worker so nothing controls the origin afterwards.
      await self.registration.unregister();

      // Reload each open window onto the fresh, worker-free shell.
      const clients = await self.clients.matchAll({ type: 'window' });
      await Promise.all(
        clients.map(async (client) => {
          try {
            await client.navigate(client.url);
          } catch {
            // Some engines restrict navigate(); the page will pick up the
            // fresh shell on its next manual reload anyway (no worker, no cache).
          }
        })
      );
    })()
  );
});
