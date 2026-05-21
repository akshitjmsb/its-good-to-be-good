/**
 * Back-compat re-export. The coffee module now lives at
 * `src/modules/coffee/`. This file is the legacy entry point still used
 * by `modalManager.ts`; once that migrates to the v2 lifecycle we can
 * drop the shim entirely.
 */
export { showCoffeeMenu } from '../../modules/coffee/controller';
