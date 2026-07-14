import { registerServiceWorker } from '../../platform/registerServiceWorker';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-container');
  if (container) container.dataset.runtime = 'tennis';
});

registerServiceWorker();
