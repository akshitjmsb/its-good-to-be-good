import { bootstrapApp } from './bootstrap';
import { registerAppWorker } from '../platform/pwa/service-worker';
import { initializeAutomaticDim } from '../platform/automaticDim';

initializeAutomaticDim();
void registerAppWorker();

document.addEventListener('DOMContentLoaded', () => {
  void bootstrapApp();
});
