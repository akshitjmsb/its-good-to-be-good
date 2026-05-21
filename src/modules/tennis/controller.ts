/**
 * Tennis module controller.
 *
 * Page entry at `src/pages/tennis.ts`. From the home this controller
 * navigates to `tennis.html`.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const TENNIS_ROUTE = 'tennis.html';

export function navigateTennisPage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = TENNIS_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateTennisPage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation owns its own teardown.
};

export const TennisModule: ModuleController = { init, destroy };
export default TennisModule;
