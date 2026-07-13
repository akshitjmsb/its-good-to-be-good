import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
    return {
      plugins: [
        VitePWA({
          // Auto-update the service worker in the background; existing tabs
          // pick up the new shell on next navigation without a prompt.
          registerType: 'autoUpdate',
          // Inject SW registration into every HTML entry so the home, journey
          // pages, and modal-host pages all participate in the same cache.
          injectRegister: 'auto',
          // We already ship a hand-tuned manifest at /public/manifest.json
          // (linked from index.html); don't let the plugin overwrite it.
          manifest: false,
          // Keep the existing manifest + icons reachable from the SW.
          includeAssets: [
            'manifest.json',
            'vitruvian-logo.svg',
            'vitruvian-man-mono.png',
            'apple-touch-icon.png',
            'icon-192.png',
            'icon-512.png',
          ],
          workbox: {
            // Precache the built shell — HTML, hashed JS/CSS, fonts shipped
            // by Vite, plus the static icons above.
            globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,json}'],
            // The home is added to the iOS home screen; serve it from the
            // precache when navigating offline.
            navigateFallback: '/index.html',
            // Multi-page app: never let the SW return index.html for the
            // other entries' asset URLs.
            navigateFallbackDenylist: [
              /^\/api\//,
              /\.[a-z0-9]+$/i,
            ],
            cleanupOutdatedCaches: true,
            runtimeCaching: [
              // Note: Convex talks to the backend over a WebSocket and keeps
              // data fresh via live subscriptions, so there's no REST endpoint
              // to runtime-cache here (the old Supabase rule is gone). The
              // localStorage WAL still provides offline/crash resilience.
              {
                // Google Fonts CSS — small, changes rarely.
                urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'google-fonts-css',
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // Google Fonts files — versioned URLs, cache-first is safe.
                urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-files',
                  expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
          },
          devOptions: {
            // Don't run the SW during `vite dev` — it causes confusing
            // stale-shell behaviour while iterating.
            enabled: false,
          },
        }),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            todo: path.resolve(__dirname, 'todo.html'),
            // being.html is a redirect stub — Being was promoted to the home.
            being: path.resolve(__dirname, 'being.html'),
            tennis: path.resolve(__dirname, 'tennis.html'),
            'khyaali-bhoot': path.resolve(__dirname, 'khyaali-bhoot.html'),
            food: path.resolve(__dirname, 'food.html'),
          }
        }
      }
    };
});
