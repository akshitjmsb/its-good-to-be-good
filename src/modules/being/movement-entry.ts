import { initializeAutomaticDim } from '../../platform/automaticDim';
import { registerAppWorker } from '../../platform/pwa/service-worker';
import { renderMovementView } from './movement-view';
import './exercise.css';

initializeAutomaticDim();
void registerAppWorker();

document.addEventListener('DOMContentLoaded', () => {
  const host = document.getElementById('movement-view');
  if (host) renderMovementView(host, new Date());
});
