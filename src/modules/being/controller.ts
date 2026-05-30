/**
 * Being module controller.
 *
 * Being is a standalone Vite entry at `src/pages/being.ts` with its own
 * `being.html`. It merges the former Meditate and Exercise modules behind
 * a two-tab interface (Meditate / Exercise). From the home this controller
 * navigates to the route; the page entry mounts both tabs.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const BEING_ROUTE = 'being.html';

export function navigateBeingPage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = BEING_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateBeingPage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation owns its own teardown.
};

export const BeingModule: ModuleController = { init, destroy };
export default BeingModule;
