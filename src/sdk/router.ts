/**
 * King client-side router.
 *
 * Phase 3 of the v2 architecture: this is the first piece of the home that
 * loads modules dynamically instead of relying on full HTML page reloads.
 *
 * Scope and back-compat:
 *
 *  - Journey modules (todo, quantum, being, money, health, travel, tennis,
 *    khyaali-bhoot) and any other `surface: 'page'` module keep their own
 *    HTML files. The router never intercepts those links — the existing
 *    multi-page navigation still works.
 *  - Learn modules with `surface: 'modal'` are now driven through the router:
 *    `router.navigate(id)` sets the URL hash, the hashchange listener mounts
 *    the controller, and closing the modal (or navigating back) calls
 *    `controller.destroy()` and clears the hash.
 *  - Anything else (future inline modules, etc.) can pass in a custom
 *    `containerResolver` to plug into the same lifecycle.
 *
 * The router never reaches into a module's internals. It only owns:
 *   1. URL ↔ module-id translation (hash format: `#/m/<id>`)
 *   2. Lifecycle: `controller.init(ctx)` on enter, `controller.destroy()` on
 *      leave, with a fresh SDK instance per mount.
 *   3. A tiny container-resolver hook so modal chrome can be shown/hidden
 *      around the mount.
 *
 * Everything outside that — modal markup, page bootstraps, registry data —
 * stays where it was.
 */

import { createModuleSDK } from './index';
import { getManifest, loadModuleController } from './loader';
import type { ModuleContext, ModuleController, ModuleManifest } from './types';

export const HASH_PREFIX = '#/m/';

const VALID_ID_REGEX = /^[a-z][a-z0-9-]*$/;

/**
 * Parse a `location.hash` string into a module id, or `null` if the hash
 * doesn't represent a module route.
 */
export function parseRouteHash(hash: string | undefined | null): string | null {
  if (typeof hash !== 'string' || hash.length === 0) return null;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const id = hash.slice(HASH_PREFIX.length);
  if (!VALID_ID_REGEX.test(id)) return null;
  return id;
}

/** Build a hash string for the given module id. */
export function formatRouteHash(moduleId: string): string {
  return `${HASH_PREFIX}${moduleId}`;
}

export interface RouterContainerResolver {
  /** DOM element the module renders into. Returning `null` aborts the mount. */
  resolve(manifest: ModuleManifest): HTMLElement | null;
  /** Called before `controller.init` — typically to reveal modal chrome. */
  onEnter?(manifest: ModuleManifest): void;
  /** Called after `controller.destroy` — typically to hide modal chrome. */
  onLeave?(manifest: ModuleManifest): void;
}

export interface RouterOptions {
  /** Window-like object used for `hashchange` and `location.hash`. */
  win?: Pick<Window, 'addEventListener' | 'removeEventListener' | 'location'>;
  /** Mounts modules into the DOM. */
  containerResolver?: RouterContainerResolver;
  /** Resolves the active content date for `ctx.today`. */
  today?: () => string;
  /** User id override for the per-module SDK. */
  userId?: string;
  /**
   * Predicate that decides which manifests the router handles. Defaults to
   * `learn`-category modules with a `modal` surface — page modules keep
   * their existing full-page navigation.
   */
  shouldHandle?(manifest: ModuleManifest): boolean;
}

export interface KingRouter {
  /** Wire up listeners and apply the current hash (if any). */
  start(): Promise<void>;
  /** Tear down listeners and unmount the active module. */
  stop(): Promise<void>;
  /** Navigate to a module id (or pass `null` to return home). */
  navigate(moduleId: string | null): Promise<void>;
  /** Currently mounted module id, or `null`. */
  current(): string | null;
}

interface MountedModule {
  manifest: ModuleManifest;
  controller: ModuleController;
}

function defaultShouldHandle(manifest: ModuleManifest): boolean {
  return manifest.category === 'learn' && manifest.surface === 'modal';
}

function defaultToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getDefaultWin():
  | Pick<Window, 'addEventListener' | 'removeEventListener' | 'location'>
  | undefined {
  return typeof window !== 'undefined' ? window : undefined;
}

export function createRouter(opts: RouterOptions = {}): KingRouter {
  const win = opts.win ?? getDefaultWin();
  const today = opts.today ?? defaultToday;
  const shouldHandle = opts.shouldHandle ?? defaultShouldHandle;
  const resolver = opts.containerResolver;

  let mounted: MountedModule | null = null;
  let started = false;
  let hashListener: (() => void) | null = null;
  // Serialise mount/unmount so a fast double-hashchange can't race.
  let queue: Promise<void> = Promise.resolve();

  async function doUnmount(): Promise<void> {
    if (!mounted) return;
    const { controller, manifest } = mounted;
    mounted = null;
    try {
      controller.destroy();
    } catch (error) {
      console.error(`[king-router] destroy failed for "${manifest.id}":`, error);
    }
    try {
      resolver?.onLeave?.(manifest);
    } catch (error) {
      console.error(
        `[king-router] onLeave failed for "${manifest.id}":`,
        error
      );
    }
  }

  async function doMount(id: string): Promise<void> {
    if (mounted?.manifest.id === id) return;
    const manifest = getManifest(id);
    if (!manifest || !shouldHandle(manifest)) return;

    await doUnmount();

    const container = resolver?.resolve(manifest) ?? null;
    if (!container) return;

    const controller = await loadModuleController(id);
    if (!controller) return;

    try {
      resolver?.onEnter?.(manifest);
    } catch (error) {
      console.error(`[king-router] onEnter failed for "${id}":`, error);
    }

    const sdk = createModuleSDK(manifest, opts.userId);
    const ctx: ModuleContext = {
      userId: sdk.user.id(),
      today: today(),
      container,
      sdk,
    };

    try {
      await controller.init(ctx);
      mounted = { manifest, controller };
    } catch (error) {
      console.error(`[king-router] init failed for "${id}":`, error);
      try {
        resolver?.onLeave?.(manifest);
      } catch (cleanupError) {
        console.error(
          `[king-router] onLeave (after init failure) failed for "${id}":`,
          cleanupError
        );
      }
    }
  }

  async function applyHash(hash: string | null | undefined): Promise<void> {
    const id = parseRouteHash(hash ?? null);
    if (id === null) {
      await doUnmount();
      return;
    }
    await doMount(id);
  }

  function enqueue(task: () => Promise<void>): Promise<void> {
    queue = queue.then(task, task);
    return queue;
  }

  async function start(): Promise<void> {
    if (started) return;
    started = true;
    if (win) {
      hashListener = () => {
        void enqueue(() => applyHash(win.location.hash));
      };
      win.addEventListener('hashchange', hashListener as EventListener);
    }
    await enqueue(() => applyHash(win?.location.hash ?? null));
  }

  async function stop(): Promise<void> {
    if (!started) return;
    if (win && hashListener) {
      win.removeEventListener('hashchange', hashListener as EventListener);
    }
    hashListener = null;
    started = false;
    await enqueue(() => doUnmount());
  }

  async function navigate(moduleId: string | null): Promise<void> {
    const targetHash = moduleId ? formatRouteHash(moduleId) : '';
    if (win) {
      const currentHash = win.location.hash ?? '';
      if (currentHash === targetHash || (targetHash === '' && currentHash === '')) {
        // No URL change — apply directly so the lifecycle still runs (e.g.
        // first mount or explicit unmount when already on home).
        await enqueue(() => applyHash(targetHash));
        return;
      }
      // Setting location.hash fires `hashchange`, which the listener picks up.
      win.location.hash = targetHash;
      return;
    }
    // Headless / no window — just drive the lifecycle directly.
    await enqueue(() => applyHash(targetHash));
  }

  return {
    start,
    stop,
    navigate,
    current: () => mounted?.manifest.id ?? null,
  };
}
