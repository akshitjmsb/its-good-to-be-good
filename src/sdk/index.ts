/**
 * King SDK factory — builds the typed SDK surface for a module.
 *
 * Each module receives its own SDK instance so permissions, namespaces,
 * and the user id are baked in. Calling an adapter the module didn't
 * declare in its manifest throws a clear error.
 */

import { createAIAdapter } from './ai';
import { createCacheAdapter } from './cache';
import { createDBAdapter } from './db';
import { sharedEventBus } from './events';
import { createStorageAdapter } from './storage';
import { createTimerAdapter } from './timer';
import { createUIAdapter } from './ui';
import { createUserAdapter } from './user';
import type {
  KingSDK,
  ModuleManifest,
  ModulePermission,
} from './types';

export * from './types';
export { createEventBus, sharedEventBus } from './events';

class PermissionError extends Error {
  constructor(moduleId: string, permission: ModulePermission, action: string) {
    super(
      `[king-sdk] Module "${moduleId}" tried to ${action} but does not have ` +
        `the "${permission}" permission. Add it to the module's manifest.json.`
    );
    this.name = 'PermissionError';
  }
}

function denyAdapter<T extends object>(
  moduleId: string,
  permission: ModulePermission,
  shape: T
): T {
  const handler: ProxyHandler<T> = {
    get(_target, prop) {
      const action = typeof prop === 'string' ? `call ${permission}.${prop}` : `use ${permission}`;
      throw new PermissionError(moduleId, permission, action);
    },
  };
  return new Proxy(shape, handler);
}

export function createModuleSDK(
  manifest: ModuleManifest,
  userIdOverride?: string
): KingSDK {
  const permissions = new Set<ModulePermission>(manifest.permissions ?? []);
  const user = createUserAdapter(userIdOverride);

  const ai = permissions.has('ai')
    ? createAIAdapter()
    : denyAdapter(manifest.id, 'ai', {} as ReturnType<typeof createAIAdapter>);

  const cache = permissions.has('cache')
    ? createCacheAdapter(manifest.id, user)
    : denyAdapter(
        manifest.id,
        'cache',
        {} as ReturnType<typeof createCacheAdapter>
      );

  const storage = permissions.has('storage')
    ? createStorageAdapter(manifest.id)
    : denyAdapter(
        manifest.id,
        'storage',
        {} as ReturnType<typeof createStorageAdapter>
      );

  const timer = permissions.has('timer')
    ? createTimerAdapter(manifest.id)
    : denyAdapter(
        manifest.id,
        'timer',
        {} as ReturnType<typeof createTimerAdapter>
      );

  return {
    ai,
    cache,
    storage,
    timer,
    // db, events, ui, user are always available — they don't gate
    // capabilities the way the permissioned adapters do.
    db: createDBAdapter(),
    events: sharedEventBus,
    ui: createUIAdapter(),
    user,
  };
}
