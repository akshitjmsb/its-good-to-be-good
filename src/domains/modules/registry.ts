import { MODULE_REGISTRY_DATA } from './registry.data.js';
import type {
  ModuleCategory,
  ModuleDefinition,
  ModuleId,
} from './types';

export type {
  JourneyModuleId,
  LearnModuleId,
  ModuleCategory,
  ModuleDefinition,
  ModuleId,
  ModuleSurface,
} from './types';

const MODULE_REGISTRY = MODULE_REGISTRY_DATA as ReadonlyArray<ModuleDefinition>;

export function getModuleById(id: ModuleId): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find(module => module.id === id);
}

export function getModulesByCategory<C extends ModuleCategory>(
  category: C
): Array<Extract<ModuleDefinition, { category: C }>> {
  return MODULE_REGISTRY.filter(
    module => module.category === category
  ) as Array<Extract<ModuleDefinition, { category: C }>>;
}

export { MODULE_REGISTRY };
