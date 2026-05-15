/**
 * Supabase persistence for user modules (custom tiles + built-in overrides).
 *
 * Strategy mirrors the task-persistence safety pattern:
 *   • Load from Supabase first; fall back to localStorage on error.
 *   • Writes go to both Supabase and localStorage (write-through cache).
 *   • A `loadedSuccessfully` guard prevents empty-load from wiping remote data.
 */

import { supabase } from '../../lib/supabase';
import type { CustomModule, ModuleOverride, ModuleOverrides } from '../../domains/modules/customModules';
import type { ModuleCategory } from '../../domains/modules/types';

const TABLE = 'user_modules';

/* ── Load ──────────────────────────────────────────────────────────── */

export async function loadCustomModulesFromSupabase(
  userId: string
): Promise<CustomModule[] | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, module_id, display_name, emoji, category, position, created_at')
      .eq('user_id', userId)
      .eq('is_custom', true)
      .order('position', { ascending: true });

    if (error || !data) {
      if (error) console.error('Error loading custom modules from Supabase:', error);
      return null; // Caller falls back to localStorage.
    }

    return data.map((row) => ({
      id: row.module_id,
      name: row.display_name,
      emoji: row.emoji,
      category: row.category,
      createdAt: new Date(row.created_at).getTime(),
    }));
  } catch (error) {
    console.error('Error loading custom modules:', error);
    return null;
  }
}

/**
 * Load the set of currently-archived module ids for this user.
 *
 * Returns the ids regardless of `is_custom` — built-in archives live in
 * placeholder rows that the override loader skips on its own.
 */
export async function loadArchivedFromSupabase(
  userId: string
): Promise<string[] | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('module_id, archived_at')
      .eq('user_id', userId)
      .not('archived_at', 'is', null);

    if (error || !data) {
      if (error) console.error('Error loading archived modules from Supabase:', error);
      return null;
    }

    return data.map((row) => row.module_id);
  } catch (error) {
    console.error('Error loading archived modules:', error);
    return null;
  }
}

export async function loadOverridesFromSupabase(
  userId: string
): Promise<ModuleOverrides | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('module_id, display_name, emoji')
      .eq('user_id', userId)
      .eq('is_custom', false);

    if (error || !data) {
      if (error) console.error('Error loading module overrides from Supabase:', error);
      return null;
    }

    const overrides: ModuleOverrides = {};
    for (const row of data) {
      const override: ModuleOverride = {};
      if (row.display_name) override.displayName = row.display_name;
      if (row.emoji) override.emoji = row.emoji;
      if (override.displayName || override.emoji) {
        overrides[row.module_id] = override;
      }
    }
    return overrides;
  } catch (error) {
    console.error('Error loading module overrides:', error);
    return null;
  }
}

/* ── Save custom modules ───────────────────────────────────────────── */

export async function saveCustomModuleToSupabase(
  userId: string,
  module: CustomModule
): Promise<void> {
  try {
    const row = {
      user_id: userId,
      module_id: module.id,
      display_name: module.name,
      emoji: module.emoji,
      category: module.category,
      is_custom: true,
      position: 0, // Will be updated when we support reordering.
      created_at: new Date(module.createdAt).toISOString(),
    };

    const { error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: 'user_id,module_id' });

    if (error) {
      console.error('Error saving custom module to Supabase:', error);
    }
  } catch (error) {
    console.error('Error saving custom module:', error);
  }
}

export async function deleteCustomModuleFromSupabase(
  userId: string,
  moduleId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('module_id', moduleId);

    if (error) {
      console.error('Error deleting custom module from Supabase:', error);
    }
  } catch (error) {
    console.error('Error deleting custom module:', error);
  }
}

export async function updateCustomModuleInSupabase(
  userId: string,
  module: CustomModule
): Promise<void> {
  // Same as save — upsert handles both insert and update.
  await saveCustomModuleToSupabase(userId, module);
}

/* ── Save overrides ────────────────────────────────────────────────── */

export async function saveOverrideToSupabase(
  userId: string,
  moduleId: string,
  patch: ModuleOverride
): Promise<void> {
  try {
    // If both fields are cleared, remove the override entirely.
    if (!patch.displayName && !patch.emoji) {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .eq('is_custom', false);

      if (error) console.error('Error removing module override from Supabase:', error);
      return;
    }

    const row = {
      user_id: userId,
      module_id: moduleId,
      display_name: patch.displayName ?? '',
      emoji: patch.emoji ?? '',
      category: 'learn' as const, // Doesn't matter for overrides, but column is NOT NULL.
      is_custom: false,
      position: 0,
    };

    const { error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: 'user_id,module_id' });

    if (error) {
      console.error('Error saving module override to Supabase:', error);
    }
  } catch (error) {
    console.error('Error saving module override:', error);
  }
}

/* ── Archive state ─────────────────────────────────────────────────── */

/**
 * Mark a module archived or active in Supabase. Built-in modules that
 * have no row yet (no override, not custom) get a placeholder row so
 * the archive bit has somewhere to land — `display_name`/`emoji` stay
 * empty, and the override loader skips empty rows.
 *
 * The diff against current state happens in-memory; this call only
 * pushes the chosen state. There is no read-modify-write here, so the
 * saveTasks-style "diff wipes new rows" failure mode does not apply.
 */
export async function setArchivedInSupabase(
  userId: string,
  moduleId: string,
  archived: boolean,
  options: {
    /** Required when the module may not yet have a row (built-ins on first archive). */
    category?: ModuleCategory;
    /** True if this is a custom module — preserves the is_custom flag on upsert. */
    isCustom?: boolean;
  } = {}
): Promise<void> {
  try {
    const archivedAt = archived ? new Date().toISOString() : null;

    // Try update first — preserves any existing override/custom fields.
    const { data: updateData, error: updateError } = await supabase
      .from(TABLE)
      .update({ archived_at: archivedAt })
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .select('module_id');

    if (updateError) {
      console.error('Error updating archive state in Supabase:', updateError);
      return;
    }

    // Row already existed → nothing more to do.
    if (updateData && updateData.length > 0) return;

    // No existing row — only meaningful when archiving. Unarchiving a
    // non-existent row is a no-op (it was never archived to begin with).
    if (!archived) return;

    const row = {
      user_id: userId,
      module_id: moduleId,
      display_name: '',
      emoji: '',
      category: options.category ?? 'learn',
      is_custom: options.isCustom ?? false,
      position: 0,
      archived_at: archivedAt,
    };

    const { error: insertError } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: 'user_id,module_id' });

    if (insertError) {
      console.error('Error inserting archive placeholder in Supabase:', insertError);
    }
  } catch (error) {
    console.error('Error setting archive state:', error);
  }
}

/* ── Bulk sync (for migrating localStorage → Supabase on first run) ─ */

export async function migrateLocalStorageToSupabase(
  userId: string,
  customs: CustomModule[],
  overrides: ModuleOverrides
): Promise<void> {
  try {
    const rows: Array<Record<string, unknown>> = [];

    customs.forEach((module, i) => {
      rows.push({
        user_id: userId,
        module_id: module.id,
        display_name: module.name,
        emoji: module.emoji,
        category: module.category,
        is_custom: true,
        position: i,
        created_at: new Date(module.createdAt).toISOString(),
      });
    });

    for (const [moduleId, override] of Object.entries(overrides)) {
      if (!override.displayName && !override.emoji) continue;
      rows.push({
        user_id: userId,
        module_id: moduleId,
        display_name: override.displayName ?? '',
        emoji: override.emoji ?? '',
        category: 'learn',
        is_custom: false,
        position: 0,
      });
    }

    if (rows.length === 0) return;

    const { error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: 'user_id,module_id' });

    if (error) {
      console.error('Error migrating modules to Supabase:', error);
    }
  } catch (error) {
    console.error('Error during module migration:', error);
  }
}
