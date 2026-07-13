/**
 * Being module controller.
 *
 * Being IS the home page since the orbit reorg: the Vitruvian Man at the
 * centre, soul practices on the circle, purpose tools on the square. The
 * runtime lives in `orbit.ts` / `meditate.ts` and is mounted by the home
 * bootstrap. `being.html` is a redirect stub kept for old bookmarks.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const BEING_ROUTE = 'index.html';

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
