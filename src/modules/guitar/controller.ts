/**
 * Guitar module ("Mr. Mojo Rising") controller.
 *
 * Opens an external app in a new tab. There is no in-app surface — the
 * legacy modalManager just maps the tile click straight to a window.open.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const MR_MOJO_RISING_URL = 'https://blissful-mccarthy-4d58a4.vercel.app';

export function openMrMojoRising(): void {
  if (typeof window === 'undefined') return;
  window.open(MR_MOJO_RISING_URL, '_blank', 'noopener,noreferrer');
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  openMrMojoRising();
};

export const destroy: ModuleController['destroy'] = () => {
  // Nothing to tear down — the user is on another tab now.
};

export const GuitarModule: ModuleController = { init, destroy };
export default GuitarModule;
