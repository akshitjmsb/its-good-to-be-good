/**
 * Persistence for user-created modules and per-module overrides.
 *
 * Two distinct concepts live here:
 *   1. Overrides — the user renamed or re-emoji'd a built-in module. Stored
 *      as a sparse map keyed by the registry's static id.
 *   2. Custom modules — entirely new tiles the user added at runtime. Each
 *      gets its own generated id (`custom-…`).
 *
 * Storage strategy:
 *   • Primary: Supabase `user_modules` table (persists across devices).
 *   • Cache: localStorage (write-through — immediate reads, offline resilience).
 *   • On boot `initModuleStore()` loads from Supabase, backfills localStorage,
 *     and auto-migrates any localStorage-only data to Supabase.
 *
 * Both stores degrade silently to empty values on parse/quota errors so
 * the home keeps rendering even if storage is corrupt.
 */
import type { ModuleCategory, ModuleId } from './types';
import {
  loadCustomModulesFromSupabase,
  loadOverridesFromSupabase,
  loadArchivedFromSupabase,
  saveCustomModuleToSupabase,
  deleteCustomModuleFromSupabase,
  updateCustomModuleInSupabase,
  saveOverrideToSupabase,
  setArchivedInSupabase,
  migrateLocalStorageToSupabase,
} from '../../infra/supabase/module-persistence';

const OVERRIDES_KEY = 'module.overrides';
const CUSTOM_LIST_KEY = 'module.custom.list';
const ARCHIVED_KEY = 'module.archived';
const MIGRATED_KEY = 'module.migrated-to-supabase';

export interface ModuleOverride {
  displayName?: string;
  emoji?: string;
}

export type ModuleOverrides = Record<string, ModuleOverride>;

export interface CustomModule {
  id: string;
  name: string;
  emoji: string;
  category: ModuleCategory;
  createdAt: number;
}

/* ── In-memory cache (populated by initModuleStore) ────────────────── */

let _cachedCustoms: CustomModule[] | null = null;
let _cachedOverrides: ModuleOverrides | null = null;
let _cachedArchived: Set<string> | null = null;
let _userId: string | null = null;
let _initialized = false;

/* ── localStorage helpers ──────────────────────────────────────────── */

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private mode — silently fail; the change applies for this session only.
  }
}

/* ── Load from localStorage (fallback / cache read) ────────────────── */

function loadOverridesFromLocalStorage(): ModuleOverrides {
  const raw = readJson<unknown>(OVERRIDES_KEY, {});
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: ModuleOverrides = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const entry = value as Record<string, unknown>;
    const override: ModuleOverride = {};
    if (typeof entry.displayName === 'string' && entry.displayName.trim()) {
      override.displayName = entry.displayName;
    }
    if (typeof entry.emoji === 'string' && entry.emoji.trim()) {
      override.emoji = entry.emoji;
    }
    if (override.displayName || override.emoji) out[id] = override;
  }
  return out;
}

function loadArchivedFromLocalStorage(): Set<string> {
  const raw = readJson<unknown>(ARCHIVED_KEY, []);
  if (!Array.isArray(raw)) return new Set();
  const out = new Set<string>();
  for (const id of raw) {
    if (typeof id === 'string' && id) out.add(id);
  }
  return out;
}

function cacheArchived(set: Set<string>): void {
  writeJson(ARCHIVED_KEY, Array.from(set));
}

function loadCustomModulesFromLocalStorage(): CustomModule[] {
  const raw = readJson<unknown>(CUSTOM_LIST_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): CustomModule[] => {
    if (!entry || typeof entry !== 'object') return [];
    const v = entry as Record<string, unknown>;
    if (
      typeof v.id !== 'string' ||
      typeof v.name !== 'string' ||
      typeof v.emoji !== 'string' ||
      (v.category !== 'journey' && v.category !== 'learn')
    ) {
      return [];
    }
    return [{
      id: v.id,
      name: v.name,
      emoji: v.emoji,
      category: v.category,
      createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now(),
    }];
  });
}

/* ── Write to localStorage (cache) ─────────────────────────────────── */

function cacheCustomModules(modules: CustomModule[]): void {
  writeJson(CUSTOM_LIST_KEY, modules);
}

function cacheOverrides(overrides: ModuleOverrides): void {
  writeJson(OVERRIDES_KEY, overrides);
}

/* ── Initialization ────────────────────────────────────────────────── */

/**
 * Boot the module store: load from Supabase, fall back to localStorage,
 * and auto-migrate if needed. Call once at app startup before rendering
 * custom tiles or applying overrides.
 */
export async function initModuleStore(userId: string): Promise<void> {
  _userId = userId;

  // Try Supabase first.
  const [remoteCustoms, remoteOverrides, remoteArchived] = await Promise.all([
    loadCustomModulesFromSupabase(userId),
    loadOverridesFromSupabase(userId),
    loadArchivedFromSupabase(userId),
  ]);

  const supabaseWorked = remoteCustoms !== null && remoteOverrides !== null;

  if (supabaseWorked) {
    _cachedCustoms = remoteCustoms;
    _cachedOverrides = remoteOverrides;
    // Archived can independently fail; default to empty rather than wipe.
    _cachedArchived = remoteArchived === null
      ? loadArchivedFromLocalStorage()
      : new Set(remoteArchived);

    // Update localStorage cache to match Supabase.
    cacheCustomModules(_cachedCustoms);
    cacheOverrides(_cachedOverrides);
    cacheArchived(_cachedArchived);

    // Check if localStorage has data that Supabase doesn't (first-time migration).
    const alreadyMigrated = readJson<boolean>(MIGRATED_KEY, false);
    if (!alreadyMigrated) {
      const localCustoms = loadCustomModulesFromLocalStorage();
      const localOverrides = loadOverridesFromLocalStorage();

      // Find localStorage entries not yet in Supabase.
      const remoteCustomIds = new Set(_cachedCustoms.map(m => m.id));
      const newCustoms = localCustoms.filter(m => !remoteCustomIds.has(m.id));

      const remoteOverrideIds = new Set(Object.keys(_cachedOverrides));
      const newOverrides: ModuleOverrides = {};
      for (const [id, override] of Object.entries(localOverrides)) {
        if (!remoteOverrideIds.has(id)) newOverrides[id] = override;
      }

      if (newCustoms.length > 0 || Object.keys(newOverrides).length > 0) {
        await migrateLocalStorageToSupabase(userId, newCustoms, newOverrides);
        // Merge into cache.
        _cachedCustoms = [..._cachedCustoms, ...newCustoms];
        for (const [id, override] of Object.entries(newOverrides)) {
          _cachedOverrides[id] = override;
        }
        cacheCustomModules(_cachedCustoms);
        cacheOverrides(_cachedOverrides);
      }

      writeJson(MIGRATED_KEY, true);
    }
  } else {
    // Supabase unavailable — use localStorage.
    _cachedCustoms = loadCustomModulesFromLocalStorage();
    _cachedOverrides = loadOverridesFromLocalStorage();
    _cachedArchived = loadArchivedFromLocalStorage();
  }

  _initialized = true;
}

/* ── Public API (synchronous — reads from in-memory cache) ─────────── */

export function loadOverrides(): ModuleOverrides {
  if (_initialized && _cachedOverrides) return { ..._cachedOverrides };
  return loadOverridesFromLocalStorage();
}

export function saveOverride(id: ModuleId | string, patch: ModuleOverride): void {
  const current = loadOverrides();
  const merged: ModuleOverride = { ...current[id] };
  if (patch.displayName !== undefined) {
    if (patch.displayName.trim()) merged.displayName = patch.displayName.trim();
    else delete merged.displayName;
  }
  if (patch.emoji !== undefined) {
    if (patch.emoji.trim()) merged.emoji = patch.emoji.trim();
    else delete merged.emoji;
  }
  if (!merged.displayName && !merged.emoji) {
    delete current[id];
  } else {
    current[id] = merged;
  }

  // Update caches.
  _cachedOverrides = current;
  cacheOverrides(current);

  // Fire-and-forget to Supabase.
  if (_userId) {
    saveOverrideToSupabase(_userId, String(id), merged).catch(() => {});
  }
}

export function loadCustomModules(): CustomModule[] {
  if (_initialized && _cachedCustoms) return [..._cachedCustoms];
  return loadCustomModulesFromLocalStorage();
}

export function saveCustomModules(modules: CustomModule[]): void {
  _cachedCustoms = modules;
  cacheCustomModules(modules);
}

export function generateCustomId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `custom-${Date.now().toString(36)}-${random}`;
}

export function addCustomModule(input: {
  name: string;
  emoji: string;
  category: ModuleCategory;
}): CustomModule {
  const list = loadCustomModules();
  const created: CustomModule = {
    id: generateCustomId(),
    name: input.name.trim(),
    emoji: input.emoji.trim(),
    category: input.category,
    createdAt: Date.now(),
  };
  list.push(created);
  saveCustomModules(list);

  // Fire-and-forget to Supabase.
  if (_userId) {
    saveCustomModuleToSupabase(_userId, created).catch(() => {});
  }

  return created;
}

export function deleteCustomModule(id: string): void {
  const list = loadCustomModules().filter(m => m.id !== id);
  saveCustomModules(list);
  // Drop any override on the deleted module so it doesn't linger.
  const overrides = loadOverrides();
  if (overrides[id]) {
    delete overrides[id];
    _cachedOverrides = overrides;
    cacheOverrides(overrides);
  }
  // Drop the archive flag too — Supabase row is gone, local state must agree.
  const archived = readArchivedSet();
  if (archived.has(id)) {
    archived.delete(id);
    _cachedArchived = archived;
    cacheArchived(archived);
  }

  // Fire-and-forget to Supabase.
  if (_userId) {
    deleteCustomModuleFromSupabase(_userId, id).catch(() => {});
  }
}

/**
 * Update an existing custom module's name/emoji in both caches and Supabase.
 */
export function updateCustomModule(id: string, patch: { name?: string; emoji?: string }): void {
  const list = loadCustomModules();
  const target = list.find(m => m.id === id);
  if (!target) return;

  if (patch.name !== undefined) target.name = patch.name;
  if (patch.emoji !== undefined) target.emoji = patch.emoji;
  saveCustomModules(list);

  // Fire-and-forget to Supabase.
  if (_userId) {
    updateCustomModuleInSupabase(_userId, target).catch(() => {});
  }
}

export function findCustomModule(id: string): CustomModule | undefined {
  return loadCustomModules().find(m => m.id === id);
}

export function isCustomId(id: string): boolean {
  return id.startsWith('custom-');
}

/* ── Archive state ─────────────────────────────────────────────────── */

function readArchivedSet(): Set<string> {
  if (_initialized && _cachedArchived) return new Set(_cachedArchived);
  return loadArchivedFromLocalStorage();
}

export function loadArchivedIds(): string[] {
  return Array.from(readArchivedSet());
}

export function isModuleArchived(id: string): boolean {
  return readArchivedSet().has(id);
}

/**
 * Archive a module so it disappears from the carousel/grid. Built-in
 * modules need a category passed in so we can write a placeholder row
 * the first time. Custom modules ignore the option since their row
 * already exists with `is_custom=true`.
 *
 * Updates the in-memory cache + localStorage synchronously so the
 * caller can re-render immediately, then fires the Supabase write
 * fire-and-forget. No read-modify-write — the diff against the desired
 * state lives on the row itself.
 */
export function archiveModule(
  id: ModuleId | string,
  category: ModuleCategory
): void {
  const set = readArchivedSet();
  if (set.has(id)) return;
  set.add(id);
  _cachedArchived = set;
  cacheArchived(set);

  if (_userId) {
    setArchivedInSupabase(_userId, String(id), true, {
      category,
      isCustom: isCustomId(String(id)),
    }).catch(() => {});
  }
}

export function unarchiveModule(id: ModuleId | string): void {
  const set = readArchivedSet();
  if (!set.has(id)) return;
  set.delete(id);
  _cachedArchived = set;
  cacheArchived(set);

  if (_userId) {
    setArchivedInSupabase(_userId, String(id), false).catch(() => {});
  }
}
