import { bootstrapApp } from './bootstrap';
import { registerServiceWorker } from '../platform/registerServiceWorker';

document.addEventListener('DOMContentLoaded', () => {
  void bootstrapApp();
});

// Register the shell's service worker with reload-on-update so a returning
// PWA never lingers on a stale, pre-fix shell.
registerServiceWorker();
