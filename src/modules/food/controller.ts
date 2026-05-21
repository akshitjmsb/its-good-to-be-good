/**
 * Food module controller.
 *
 * Curated meal calendar — fully offline, deterministic per (week-start,
 * day-of-week, meal). The `init` lifecycle renders into the host
 * container; `showFoodModal(date, todayKey)` is the legacy surface that
 * `modalManager.ts` still calls.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalTitle,
} from '../../core/modal-factory';
import { renderFoodView } from './view';

let teardownHost: (() => void) | null = null;

export const init: ModuleController['init'] = async (ctx: ModuleContext) => {
  destroy();
  const active = new Date(`${ctx.today}T00:00:00`);
  const referenceDate = Number.isNaN(active.getTime()) ? new Date() : active;
  renderFoodView(ctx.container, referenceDate);

  teardownHost = () => {
    ctx.container.replaceChildren();
  };
};

export const destroy: ModuleController['destroy'] = () => {
  teardownHost?.();
  teardownHost = null;
};

export const FoodModule: ModuleController = { init, destroy };
export default FoodModule;

/* ── Legacy surface used by src/components/modals/modalManager.ts ─────── */

export function showFoodModal(date: Date, _todayKey: string): void {
  const elements = getModalElements(MODAL_CONFIGS.food);
  if (!elements) return;

  // Curated pool is fully local — no API call, no loading state needed.
  elements.modal.classList.remove('hidden');
  elements.modal.classList.add('flex');
  elements.content.innerHTML = '';
  setModalTitle(elements, 'Food');
  renderFoodView(elements.content, date);
}
