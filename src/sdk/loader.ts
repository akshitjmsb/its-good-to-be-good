/**
 * Module loader — discovers manifests at build time via Vite's
 * `import.meta.glob`, and provides a lazy controller loader.
 *
 * Manifests are JSON files at `src/modules/<id>/manifest.json` and are
 * pulled in eagerly because they're small (a few hundred bytes each).
 * Controllers are loaded lazily so a module's runtime weight stays off
 * the home cold-start path.
 */

import type { ModuleController, ModuleManifest } from './types';

type ControllerLoader = () => Promise<{ default?: ModuleController } & Record<string, unknown>>;

// Eager — all manifests resolved into a flat record at build time.
const manifestModules = import.meta.glob<{ default: ModuleManifest } | ModuleManifest>(
  '../modules/*/manifest.json',
  { eager: true }
);

// Lazy — each controller is its own chunk.
const controllerModules = import.meta.glob<Record<string, unknown>>(
  '../modules/*/controller.ts'
);

function unwrapManifest(
  m: { default: ModuleManifest } | ModuleManifest
): ModuleManifest {
  if (m && typeof m === 'object' && 'default' in m && m.default) {
    return (m as { default: ModuleManifest }).default;
  }
  return m as ModuleManifest;
}

function moduleIdFromPath(filePath: string): string {
  // `../modules/<id>/manifest.json` -> `<id>`
  const match = /\/modules\/([^/]+)\//.exec(filePath);
  return match?.[1] ?? '';
}

const MANIFESTS_BY_ID = new Map<string, ModuleManifest>();
for (const [filePath, mod] of Object.entries(manifestModules)) {
  const manifest = unwrapManifest(mod);
  const idFromPath = moduleIdFromPath(filePath);
  // Trust the path as the authoritative id; the architecture guard
  // verifies the manifest body matches.
  const id = manifest?.id ?? idFromPath;
  if (!id) continue;
  MANIFESTS_BY_ID.set(id, { ...manifest, id });
}

const CONTROLLER_LOADERS = new Map<string, ControllerLoader>();
for (const [filePath, loader] of Object.entries(controllerModules)) {
  const id = moduleIdFromPath(filePath);
  if (!id) continue;
  CONTROLLER_LOADERS.set(id, loader as ControllerLoader);
}

/** All discovered manifests in stable id order. */
export function getAllManifests(): ModuleManifest[] {
  return [...MANIFESTS_BY_ID.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  );
}

/** Look up a single manifest by id. */
export function getManifest(id: string): ModuleManifest | null {
  return MANIFESTS_BY_ID.get(id) ?? null;
}

/**
 * Lazily import a module's controller. Returns the `ModuleController`
 * if the module exports `default`, `controller`, or both `init`/`destroy`
 * directly.
 */
export async function loadModuleController(
  id: string
): Promise<ModuleController | null> {
  const loader = CONTROLLER_LOADERS.get(id);
  if (!loader) return null;
  const mod = await loader();
  const direct = mod as Record<string, unknown>;
  if (typeof direct.init === 'function' && typeof direct.destroy === 'function') {
    return direct as unknown as ModuleController;
  }
  if (
    direct.controller &&
    typeof direct.controller === 'object' &&
    'init' in (direct.controller as object) &&
    'destroy' in (direct.controller as object)
  ) {
    return direct.controller as ModuleController;
  }
  if (
    direct.default &&
    typeof direct.default === 'object' &&
    'init' in (direct.default as object) &&
    'destroy' in (direct.default as object)
  ) {
    return direct.default as ModuleController;
  }
  return null;
}
