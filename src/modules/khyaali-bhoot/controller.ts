/**
 * Khyaali Bhoot module controller.
 *
 * Page entry at `src/pages/khyaali-bhoot.ts`. From the home this
 * controller navigates to `khyaali-bhoot.html`.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const KHYAALI_BHOOT_ROUTE = 'khyaali-bhoot.html';

export function navigateKhyaaliBhootPage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = KHYAALI_BHOOT_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateKhyaaliBhootPage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation owns its own teardown.
};

export const KhyaaliBhootModule: ModuleController = { init, destroy };
export default KhyaaliBhootModule;
