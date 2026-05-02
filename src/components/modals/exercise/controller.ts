import { MODAL_CONFIGS, getModalElements } from '../factory';
import { renderExerciseView } from './view';

export function showExerciseModal(date: Date): void {
  const elements = getModalElements(MODAL_CONFIGS.exercise);
  if (!elements) return;

  // Curated pool is fully local — no API call, no loading state needed.
  elements.modal.classList.remove('hidden');
  elements.modal.classList.add('flex');
  elements.content.innerHTML = '';
  renderExerciseView(elements.content, date);
}
