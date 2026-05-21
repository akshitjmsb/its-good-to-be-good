/**
 * Travel module controller.
 *
 * The Travel page is a Vite entry at `src/pages/travel.ts`. From the
 * home this controller navigates to `travel.html`.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const TRAVEL_ROUTE = 'travel.html';

export function navigateTravelPage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = TRAVEL_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateTravelPage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation owns its own teardown.
};

export const TravelModule: ModuleController = { init, destroy };
export default TravelModule;
