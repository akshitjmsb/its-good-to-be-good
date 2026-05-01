export {
  ai,
  hasApiKey,
  callPerplexityAPI,
  parseJsonResponse,
} from './client';
export type {
  ResponseSchema,
  SchemaProperty,
  GenerateContentConfig,
  PerplexityOptions,
} from './client';

export {
  getOrGenerateDynamicContent,
  getOrGeneratePlanForDate,
  generateFoodPlanForDate,
  generateWeeklyExerciseContent,
} from './generators';
export type { ContentType } from './generators';

export {
  getFallbackAnalytics,
  getFallbackClassicRockPool,
  getFallbackExercisePlan,
  getFallbackFoodPlan,
  getFallbackPhysics,
  getFallbackWeeklyExercise,
} from './fallbacks';
export type {
  AnalyticsContent,
  Exercise,
  ExerciseDay,
  ExercisePlanContent,
  GuitarPoolItem,
  PhysicsContent,
  WeeklyExerciseContent,
} from './fallbacks';
