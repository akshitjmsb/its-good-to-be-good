/**
 * Meditate module controller.
 *
 * The Meditate page is a standalone Vite entry at `src/pages/meditate.ts`
 * with its own `meditate.html`. From the home this controller navigates
 * to the route; the page entry mounts the timer + breath UI.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const MEDITATE_ROUTE = 'meditate.html';

export function navigateMeditatePage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = MEDITATE_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateMeditatePage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation owns its own teardown.
};

export const MeditateModule: ModuleController = { init, destroy };
export default MeditateModule;
