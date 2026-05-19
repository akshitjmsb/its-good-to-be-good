import { MODAL_CONFIGS, getModalElements, setModalTitle } from '../factory';
import { renderFoodView } from './view';

export function showFoodModal(date: Date, _todayKey: string): void {
  const elements = getModalElements(MODAL_CONFIGS.food);
  if (!elements) return;

  // Curated pool is fully local — no API call, no loading state needed.
  elements.modal.classList.remove('hidden');
  elements.modal.classList.add('flex');
  elements.content.innerHTML = '';
  setModalTitle(elements, "Today's Food");
  renderFoodView(elements.content, date);
}
