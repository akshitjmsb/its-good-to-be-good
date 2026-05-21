/**
 * French module controller.
 *
 * The French translator is a standalone React app whose Vite entry lives
 * at `src/apps/french-translator/main.tsx`. From the home, we just
 * navigate there. The actual React app remains in `src/apps/` because
 * it has its own bundle entry; this controller is a thin handle.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const FRENCH_ROUTE = 'french.html';

export function navigateToFrenchPage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = FRENCH_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateToFrenchPage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation tears the SPA down — nothing to undo here.
};

export const FrenchModule: ModuleController = { init, destroy };
export default FrenchModule;
