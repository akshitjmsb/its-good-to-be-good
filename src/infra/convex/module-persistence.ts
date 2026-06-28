/**
 * Convex persistence for user modules (custom tiles + built-in overrides).
 *
 * Strategy mirrors the task-persistence safety pattern:
 *   • Load from Convex first; fall back to localStorage on error (null return).
 *   • Writes go to both Convex and localStorage (write-through cache).
 *   • A `loadedSuccessfully` guard in the caller prevents empty-load from
 *     wiping remote data.
 *
 * The `userId` parameter is vestigial — identity comes from the authenticated
 * Convex client context — but is kept so call sites stay identical.
 */

import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import type {
  CustomModule,
  ModuleOverride,
  ModuleOverrides,
} from '../../domains/modules/customModules';
import type { ModuleCategory } from '../../domains/modules/types';

interface CustomRow {
  moduleId: string;
  displayName: string;
  emoji: string;
  category: ModuleCategory;
  createdAt: string;
}

interface OverrideRow {
  moduleId: string;
  displayName: string;
  emoji: string;
}

/* ── Load ──────────────────────────────────────────────────────────── */

export async function loadCustomModulesFromConvex(
  _userId: string
): Promise<CustomModule[] | null> {
  try {
    const rows = (await convex.query(api.userModules.listCustom, {})) as CustomRow[];
    return rows.map((row) => ({
      id: row.moduleId,
      name: row.displayName,
      emoji: row.emoji,
      category: row.category,
      createdAt: new Date(row.createdAt).getTime(),
    }));
  } catch (error) {
    console.error('Error loading custom modules from Convex:', error);
    return null; // Caller falls back to localStorage.
  }
}

/**
 * Load the set of currently-archived module ids for this user. Returns ids
 * regardless of `isCustom` — built-in archives live in placeholder rows.
 */
export async function loadArchivedFromConvex(
  _userId: string
): Promise<string[] | null> {
  try {
    return (await convex.query(api.userModules.listArchived, {})) as string[];
  } catch (error) {
    console.error('Error loading archived modules from Convex:', error);
    return null;
  }
}

export async function loadOverridesFromConvex(
  _userId: string
): Promise<ModuleOverrides | null> {
  try {
    const rows = (await convex.query(
      api.userModules.listOverrides,
      {}
    )) as OverrideRow[];

    const overrides: ModuleOverrides = {};
    for (const row of rows) {
      const override: ModuleOverride = {};
      if (row.displayName) override.displayName = row.displayName;
      if (row.emoji) override.emoji = row.emoji;
      if (override.displayName || override.emoji) {
        overrides[row.moduleId] = override;
      }
    }
    return overrides;
  } catch (error) {
    console.error('Error loading module overrides from Convex:', error);
    return null;
  }
}

/* ── Save custom modules ───────────────────────────────────────────── */

export async function saveCustomModuleToConvex(
  _userId: string,
  module: CustomModule
): Promise<void> {
  try {
    await convex.mutation(api.userModules.upsertModule, {
      moduleId: module.id,
      displayName: module.name,
      emoji: module.emoji,
      category: module.category,
      isCustom: true,
      position: 0, // Updated when reordering is supported.
      createdAt: new Date(module.createdAt).toISOString(),
    });
  } catch (error) {
    console.error('Error saving custom module to Convex:', error);
  }
}

export async function deleteCustomModuleFromConvex(
  _userId: string,
  moduleId: string
): Promise<void> {
  try {
    await convex.mutation(api.userModules.deleteModule, { moduleId });
  } catch (error) {
    console.error('Error deleting custom module from Convex:', error);
  }
}

export async function updateCustomModuleInConvex(
  userId: string,
  module: CustomModule
): Promise<void> {
  // Same as save — upsert handles both insert and update.
  await saveCustomModuleToConvex(userId, module);
}

/* ── Save overrides ────────────────────────────────────────────────── */

export async function saveOverrideToConvex(
  _userId: string,
  moduleId: string,
  patch: ModuleOverride
): Promise<void> {
  try {
    await convex.mutation(api.userModules.saveOverride, {
      moduleId,
      displayName: patch.displayName ?? '',
      emoji: patch.emoji ?? '',
    });
  } catch (error) {
    console.error('Error saving module override to Convex:', error);
  }
}

/* ── Archive state ─────────────────────────────────────────────────── */

/**
 * Mark a module archived or active in Convex. Built-in modules that have no
 * row yet get a placeholder row so the archive bit has somewhere to land.
 * There is no read-modify-write here, so the "diff wipes new rows" failure
 * mode does not apply.
 */
export async function setArchivedInConvex(
  _userId: string,
  moduleId: string,
  archived: boolean,
  options: {
    /** Required when the module may not yet have a row (built-ins on first archive). */
    category?: ModuleCategory;
    /** True if this is a custom module — preserves the isCustom flag on insert. */
    isCustom?: boolean;
  } = {}
): Promise<void> {
  try {
    await convex.mutation(api.userModules.setArchived, {
      moduleId,
      archived,
      category: options.category,
      isCustom: options.isCustom,
    });
  } catch (error) {
    console.error('Error setting archive state in Convex:', error);
  }
}

/* ── Bulk sync (for migrating localStorage → Convex on first run) ─── */

export async function migrateLocalStorageToConvex(
  _userId: string,
  customs: CustomModule[],
  overrides: ModuleOverrides
): Promise<void> {
  try {
    const rows: Array<{
      moduleId: string;
      displayName: string;
      emoji: string;
      category: ModuleCategory;
      isCustom: boolean;
      position: number;
      createdAt?: string;
    }> = [];

    customs.forEach((module, i) => {
      rows.push({
        moduleId: module.id,
        displayName: module.name,
        emoji: module.emoji,
        category: module.category,
        isCustom: true,
        position: i,
        createdAt: new Date(module.createdAt).toISOString(),
      });
    });

    for (const [moduleId, override] of Object.entries(overrides)) {
      if (!override.displayName && !override.emoji) continue;
      rows.push({
        moduleId,
        displayName: override.displayName ?? '',
        emoji: override.emoji ?? '',
        category: 'learn',
        isCustom: false,
        position: 0,
      });
    }

    if (rows.length === 0) return;

    await convex.mutation(api.userModules.bulkUpsert, { rows });
  } catch (error) {
    console.error('Error during module migration to Convex:', error);
  }
}
