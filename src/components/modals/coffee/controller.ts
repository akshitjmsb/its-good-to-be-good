import { MODAL_CONFIGS, getModalElements } from '../factory';
import { renderCoffeeView } from './view';

export function showCoffeeMenu(date: Date): void {
  const elements = getModalElements(MODAL_CONFIGS.coffee);
  if (!elements) return;

  // Curated pool is local — no API call, no loading state needed.
  elements.modal.classList.remove('hidden');
  elements.modal.classList.add('flex');
  elements.content.innerHTML = '';
  renderCoffeeView(elements.content, date);
}
