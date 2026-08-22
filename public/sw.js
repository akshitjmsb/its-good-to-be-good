/* Notification-only worker. It deliberately has no fetch handler and creates
 * no cache, so app pages always come from the network rather than a stale PWA
 * shell. */

self.addEventListener('install', () => {
  // Activate now — do not wait for existing pages to close. iOS standalone
  // PWAs suspend instead of closing, so waiting would mean never activating.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map(key => caches.delete(key)));
    })()
  );
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {};
  }
  if (!payload.title) return;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      data: payload.data ?? { url: '/todo.html' },
      icon: '/apple-touch-icon.png',
      badge: '/vitruvian-logo.svg',
      tag: payload.data?.url ?? 'todo-reminder',
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.url ?? '/todo.html';
  const targetUrl = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ('navigate' in client) await client.navigate(targetUrl);
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })()
  );
});
