/**
 * Back-compat re-export. The world-order module now lives at
 * `src/modules/world-order/`. This file is kept so `modalManager.ts`
 * can keep dynamically importing the legacy path.
 */
export { fetchAndShowWorldOrder } from '../../modules/world-order/controller';
