/**
 * Quantum module controller.
 *
 * The Quantum page is a standalone Vite entry at `src/pages/quantum.ts`
 * with its own `quantum.html`. From the home this controller navigates
 * to the route; the page entry mounts the actual UI.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const QUANTUM_ROUTE = 'quantum.html';

export function navigateQuantumPage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = QUANTUM_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateQuantumPage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation owns its own teardown.
};

export const QuantumModule: ModuleController = { init, destroy };
export default QuantumModule;
