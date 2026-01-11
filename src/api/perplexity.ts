/**
 * Perplexity API Module
 * Re-exports from modular structure for backward compatibility
 */

// Re-export client
export { ai, hasApiKey, callPerplexityAPI, parseJsonResponse } from "./client";
export type { ResponseSchema, SchemaProperty, GenerateContentConfig } from "./client";

// Re-export generators
export {
    getOrGenerateDynamicContent,
    getOrGeneratePlanForDate,
    generateFoodPlanForDate,
    generateWeeklyExerciseContent
} from "./generators";
