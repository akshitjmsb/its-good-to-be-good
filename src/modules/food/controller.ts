/**
 * Food module controller.
 *
 * Curated meal calendar — fully offline, deterministic per (week-start,
 * day-of-week, meal). The `init` lifecycle renders into the host
 * container; the page entry at `src/pages/food.ts` mounts the view for
 * `food.html`.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';
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
