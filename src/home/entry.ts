import { bootstrapApp } from './bootstrap';
import { registerAppWorker } from '../platform/pwa/service-worker';

void registerAppWorker();

document.addEventListener('DOMContentLoaded', () => {
  void bootstrapApp();
});
