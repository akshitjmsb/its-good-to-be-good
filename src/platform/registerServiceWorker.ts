/**
 * Service-worker registration with self-healing auto-update.
 *
 * The app is an installed iOS PWA — the service worker precaches the app
 * shell so it opens offline. The cost of precaching is staleness: a returning
 * user keeps running whatever shell their worker cached last, so a since-fixed
 * bug lingers on the device long after the deploy that fixed it.
 *
 * That bit the orbit. A stale shell that predated the bootstrap guard
 * (`fix(home): guard each bootstrap step…`) never wired up the Sukoon
 * practices' click handlers, so Breathe / OM / Sleep looked dead on prod even
 * though the deployed code was correct — the device was pinned to the old
 * shell and nothing moved it forward.
 *
 * Why it got stuck: `registerType: 'autoUpdate'` builds a worker that skips
 * waiting only when a client posts `{ type: 'SKIP_WAITING' }`, and it does not
 * `clients.claim()`. The plugin's own register-only script (which we no longer
 * inject) never posts that message, so a freshly-installed worker parks in the
 * `waiting` state indefinitely while the old worker keeps serving the stale
 * shell. An installed PWA is resumed rather than fully closed, so "close every
 * tab to let it activate" effectively never happens.
 *
 * This registration drives the whole handshake:
 *   1. Post `SKIP_WAITING` to any worker that reaches `installed` while an old
 *      worker is still in control (an update), including one already waiting
 *      from a previous visit.
 *   2. That worker activates and takes control, firing `controllerchange`.
 *   3. Reload once so the freshly-activated shell is what the user sees.
 *
 * `update()` on load forces the browser to look for a new worker each time the
 * app opens, since a resumed PWA may otherwise defer its periodic check.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  // Reload once when a new worker takes control. On the very first install
  // there is no prior controller (and this worker does not claim), so
  // `controllerchange` does not fire and we do not reload — the `reloading`
  // latch additionally guards against any second event racing the navigation.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  // Tell a worker to activate — but only when an old worker is still in
  // control, i.e. this is an update, not the first install.
  const promote = (worker: ServiceWorker | null): void => {
    if (worker && navigator.serviceWorker.controller) {
      worker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(registration => {
        // A worker may already be waiting from a previous visit.
        promote(registration.waiting);

        // …or one may install now (or later, from the update() below).
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') promote(installing);
          });
        });

        void registration.update();
      })
      .catch(error => {
        console.error('[sw] registration failed:', error);
      });
  });
}
