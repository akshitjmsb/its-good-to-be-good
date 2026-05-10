/**
 * Persistence for user-created modules and per-module overrides.
 *
 * Two distinct concepts live here:
 *   1. Overrides — the user renamed or re-emoji'd a built-in module. Stored
 *      as a sparse map keyed by the registry's static id.
 *   2. Custom modules — entirely new tiles the user added at runtime. Each
 *      gets its own generated id (`custom-…`) and lives only in
 *      localStorage; the generic `custom.html` page renders their shell.
 *
 * Both stores degrade silently to empty values on parse/quota errors so
 * the home keeps rendering even if storage is corrupt.
 */
import type { ModuleCategory, ModuleId } from './types';

const OVERRIDES_KEY = 'module.overrides';
const CUSTOM_LIST_KEY = 'module.custom.list';

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

export function loadOverrides(): ModuleOverrides {
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
  writeJson(OVERRIDES_KEY, current);
}

export function loadCustomModules(): CustomModule[] {
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

export function saveCustomModules(modules: CustomModule[]): void {
  writeJson(CUSTOM_LIST_KEY, modules);
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
  return created;
}

export function deleteCustomModule(id: string): void {
  const list = loadCustomModules().filter(m => m.id !== id);
  saveCustomModules(list);
  // Drop any override on the deleted module so it doesn't linger.
  const overrides = loadOverrides();
  if (overrides[id]) {
    delete overrides[id];
    writeJson(OVERRIDES_KEY, overrides);
  }
}

export function findCustomModule(id: string): CustomModule | undefined {
  return loadCustomModules().find(m => m.id === id);
}

export function isCustomId(id: string): boolean {
  return id.startsWith('custom-');
}
