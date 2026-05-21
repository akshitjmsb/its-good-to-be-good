/**
 * Health module controller.
 *
 * The Health page is a Vite entry at `src/pages/health.ts` (which just
 * tags `<#app-container data-runtime="health">` so per-page styling can
 * apply). From the home this controller navigates to `health.html`.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const HEALTH_ROUTE = 'health.html';

export function navigateHealthPage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = HEALTH_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateHealthPage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation owns its own teardown.
};

export const HealthModule: ModuleController = { init, destroy };
export default HealthModule;
