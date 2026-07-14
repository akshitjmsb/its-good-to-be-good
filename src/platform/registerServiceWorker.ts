/**
 * Service-worker registration with self-healing auto-update.
 *
 * The app is an installed iOS PWA — the service worker precaches the app
 * shell so it opens offline. The cost of precaching is staleness: a returning
 * user keeps running whatever shell their worker cached last, so a since-fixed
 * bug lingers on the device long after the deploy that fixed it. That is how
 * the orbit (and even the localStorage-only Quantum timer) stayed broken on
 * phones while the deployed code was already correct.
 *
 * The rescue has to live in TWO places, because the shell JS that a client
 * runs is itself part of what goes stale:
 *
 *   1. sw.js self-activates — `skipWaiting` + `clientsClaim` (set in
 *      vite.config.ts). A newly-installed worker promotes itself past the
 *      `waiting` phase and claims open pages on its own, with NO cooperation
 *      from the page. This is the half that reaches a stranded device: the
 *      browser fetches sw.js directly, so it runs even while the old shell is
 *      the thing being served. (An earlier attempt drove activation by having
 *      the client post `SKIP_WAITING`, but that message lives in the new shell
 *      — which never loads while the old worker is still in control, so the
 *      new worker parked in `waiting` forever. Self-activation avoids the
 *      chicken-and-egg entirely.)
 *
 *   2. This function reloads once when that new worker takes control, so the
 *      fresh shell replaces the stale one the user is looking at — rather than
 *      waiting for the next manual reopen.
 *
 * `update()` on load forces the browser to look for a new worker each time the
 * app opens, since a resumed PWA may otherwise defer its periodic check.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  // Reload once when a *new* worker takes control (an update). `hadController`
  // skips the first-ever install: because the worker calls `clientsClaim`, it
  // claims the page on first load too, and that initial `controllerchange`
  // must not trigger a reload (nor a reload loop). The `reloading` latch
  // additionally guards against a second event racing the navigation.
  let reloading = false;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(registration => {
        // A resumed home-screen PWA may not run the browser's periodic update
        // check, so force one on each open. The worker self-activates once a
        // new one is found (see sw.js's skipWaiting/clientsClaim above).
        void registration.update();
      })
      .catch(error => {
        console.error('[sw] registration failed:', error);
      });
  });
}
