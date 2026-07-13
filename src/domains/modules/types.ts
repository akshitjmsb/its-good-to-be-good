/**
 * Module registry types.
 *
 * Since the orbit-home reorg every registered module is a "purpose tool":
 * a page of its own, reached from a square tile on the home. (The soul
 * practices — Breathe / OM / Sleep / Stretch / Weights — belong to the
 * home itself and are not registry entries.)
 */

export type JourneyModuleId = 'todo' | 'khyaali-bhoot' | 'tennis' | 'food';

export type ModuleId = JourneyModuleId;

export type ModuleCategory = 'journey';

export type ModuleSurface = 'page';

export interface BaseModuleDefinition {
  displayName: string;
  surface: ModuleSurface;
  entrySelector: string;
  handlerName: string;
  ownerPath: string;
  routeHref: string;
  dataModule?: string;
}

export interface JourneyModuleDefinition extends BaseModuleDefinition {
  id: JourneyModuleId;
  category: 'journey';
}

export type ModuleDefinition = JourneyModuleDefinition;
