/**
 * Money module controller.
 *
 * The Money page is a standalone Vite entry at `src/pages/money.ts`
 * with its own `money.html`. From the home this controller navigates
 * to the route; the page entry owns the actual UI.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const MONEY_ROUTE = 'money.html';

export function navigateMoneyPage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = MONEY_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateMoneyPage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation owns its own teardown.
};

export const MoneyModule: ModuleController = { init, destroy };
export default MoneyModule;
