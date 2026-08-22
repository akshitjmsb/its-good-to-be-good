import path from 'path';
import { defineConfig } from 'vite';

// No service worker is generated. The app previously precached its shell via
// vite-plugin-pwa, but on installed iOS/Safari PWAs a stale precached shell
// repeatedly stranded devices on old, broken code that no update could reach
// (the shell JS that drives a worker update can't run while the old worker is
// still serving the old shell). We ship a self-destroying `public/sw.js`
// instead. `public/sw.js` is now notification-only: it has no fetch handler and
// never caches an app asset, so every launch still loads current code straight
// from the CDN. Installability (manifest + icons) is unaffected.
export default defineConfig(() => {
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
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
        },
      },
    },
  };
});
