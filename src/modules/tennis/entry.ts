import { registerAppWorker } from '../../platform/pwa/service-worker';
import { initializeAutomaticDim } from '../../platform/automaticDim';

initializeAutomaticDim();
void registerAppWorker();

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-container');
  if (container) container.dataset.runtime = 'tennis';
});
