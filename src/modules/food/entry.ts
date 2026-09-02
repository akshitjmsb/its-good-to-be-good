import { initializeAutomaticDim } from '../../platform/automaticDim';
import { registerAppWorker } from '../../platform/pwa/service-worker';
import { renderFoodView } from './view';
import './food.css';

initializeAutomaticDim();
void registerAppWorker();

document.addEventListener('DOMContentLoaded', () => {
  const host = document.getElementById('food-view');
  if (host) renderFoodView(host, new Date());
});
