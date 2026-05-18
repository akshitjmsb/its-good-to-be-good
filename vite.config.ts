import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
    return {
      plugins: [
        react(),
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
              {
                // Supabase REST queries — stale-while-revalidate keeps the
                // UI instant on reopen and refreshes in the background.
                urlPattern: ({ url }) =>
                  url.hostname.endsWith('.supabase.co') &&
                  url.pathname.startsWith('/rest/v1/'),
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'supabase-rest',
                  expiration: {
                    maxEntries: 60,
                    maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
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
            health: path.resolve(__dirname, 'health.html'),
            meditate: path.resolve(__dirname, 'meditate.html'),
            money: path.resolve(__dirname, 'money.html'),
            quantum: path.resolve(__dirname, 'quantum.html'),
            travel: path.resolve(__dirname, 'travel.html'),
            tennis: path.resolve(__dirname, 'tennis.html'),
            'khyaali-bhoot': path.resolve(__dirname, 'khyaali-bhoot.html'),
            french: path.resolve(__dirname, 'french.html'),
            custom: path.resolve(__dirname, 'custom.html'),
          }
        }
      }
    };
});
