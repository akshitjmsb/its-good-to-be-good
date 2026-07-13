export type JourneyModuleId =
  | 'todo'
  | 'being'
  | 'tennis'
  | 'khyaali-bhoot';

export type LearnModuleId = 'food';

export type ModuleId = JourneyModuleId | LearnModuleId;

export type ModuleCategory = 'journey' | 'learn';

export type ModuleSurface = 'page' | 'modal';

export interface BaseModuleDefinition {
  displayName: string;
  surface: ModuleSurface;
  entrySelector: string;
  handlerName: string;
  ownerPath: string;
  iconElementId?: string;
  modalId?: string;
  routeHref?: string;
  dataModule?: string;
}

export interface JourneyModuleDefinition extends BaseModuleDefinition {
  id: JourneyModuleId;
  category: 'journey';
}

export interface LearnModuleDefinition extends BaseModuleDefinition {
  id: LearnModuleId;
  category: 'learn';
}

export type ModuleDefinition = JourneyModuleDefinition | LearnModuleDefinition;
