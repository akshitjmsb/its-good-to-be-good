/**
 * App-layer glue for the King router.
 *
 * The router itself (src/sdk/router.ts) is framework-agnostic — it only
 * understands manifests, lifecycle, and the URL hash. This file teaches it
 * how to find the right modal chrome in the existing home markup so a
 * modal-surface module can mount into the same container the legacy modal
 * manager has always used.
 *
 * Out of scope for now:
 *  - Journey/page modules. They still navigate via `window.location.href`.
 *  - Future inline modules. Their resolver would live alongside this one
 *    once we have an example to point at.
 */

import { MODAL_CONFIGS } from '../components/modals/factory';
import { createRouter, type KingRouter, type RouterContainerResolver } from '../sdk/router';
import type { ModuleManifest } from '../sdk/types';

/**
 * Mapping from a module manifest id to the legacy modal config key. The
 * router uses this to find the modal wrapper and content container that
 * already live in `index.html`.
 */
const MODULE_ID_TO_MODAL_CONFIG: Record<string, keyof typeof MODAL_CONFIGS> = {
  coffee: 'coffee',
  'world-order': 'worldOrder',
  poetry: 'poetry',
  food: 'food',
  curious: 'hood',
  analytics: 'analytics',
  exercise: 'exercise',
};

function modalConfigFor(manifest: ModuleManifest) {
  const key = MODULE_ID_TO_MODAL_CONFIG[manifest.id];
  if (!key) return null;
  return MODAL_CONFIGS[key] ?? null;
}

/**
 * Default container resolver: maps a manifest to the modal wrapper +
 * content container declared in `index.html`. Showing/hiding the wrapper
 * is owned here so individual controllers don't need to repeat the
 * `classList.toggle('hidden' | 'flex')` dance.
 */
export const modalContainerResolver: RouterContainerResolver = {
  resolve(manifest) {
    const config = modalConfigFor(manifest);
    if (!config) return null;
    return document.getElementById(config.contentId);
  },
  onEnter(manifest) {
    const config = modalConfigFor(manifest);
    if (!config) return;
    const wrapper = document.getElementById(config.modalId);
    if (!wrapper) return;
    wrapper.classList.remove('hidden');
    wrapper.classList.add('flex');
  },
  onLeave(manifest) {
    const config = modalConfigFor(manifest);
    if (!config) return;
    const wrapper = document.getElementById(config.modalId);
    if (!wrapper) return;
    wrapper.classList.add('hidden');
    wrapper.classList.remove('flex');
  },
};

export interface AppRouterOptions {
  today?: () => string;
  userId?: string;
}

/**
 * Build the production router with the default modal resolver wired up.
 * Test code can construct its own router via `createRouter` directly.
 */
export function createAppRouter(opts: AppRouterOptions = {}): KingRouter {
  return createRouter({
    containerResolver: modalContainerResolver,
    today: opts.today,
    userId: opts.userId,
  });
}
