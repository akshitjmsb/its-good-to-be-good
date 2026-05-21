/**
 * Exercise module controller.
 *
 * Curated PPL + Upper schedule, deterministic per (week-start, workout
 * type). Fully offline. `init` renders into the host container;
 * `showExerciseModal(date)` is the legacy entry kept for
 * `modalManager.ts`.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';
import { MODAL_CONFIGS, getModalElements } from '../../core/modal-factory';
import { renderExerciseView } from './view';

let teardownHost: (() => void) | null = null;

export const init: ModuleController['init'] = async (ctx: ModuleContext) => {
  destroy();
  const active = new Date(`${ctx.today}T00:00:00`);
  const referenceDate = Number.isNaN(active.getTime()) ? new Date() : active;
  renderExerciseView(ctx.container, referenceDate);

  teardownHost = () => {
    ctx.container.replaceChildren();
  };
};

export const destroy: ModuleController['destroy'] = () => {
  teardownHost?.();
  teardownHost = null;
};

export const ExerciseModule: ModuleController = { init, destroy };
export default ExerciseModule;

/* ── Legacy surface used by src/components/modals/modalManager.ts ─────── */

export function showExerciseModal(date: Date): void {
  const elements = getModalElements(MODAL_CONFIGS.exercise);
  if (!elements) return;

  elements.modal.classList.remove('hidden');
  elements.modal.classList.add('flex');
  elements.content.innerHTML = '';
  renderExerciseView(elements.content, date);
}
