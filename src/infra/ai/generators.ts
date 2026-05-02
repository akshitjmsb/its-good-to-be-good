import {
  getCachedContent,
  getCachedFoodPlan,
  saveCachedContent,
  saveFoodPlan,
} from '../supabase/content-cache';
import { callPerplexityAPI, hasApiKey, parseJsonResponse } from './client';
import { ErrorHandler } from '../../utils/errorHandling';
import {
  getFallbackAnalytics,
  getFallbackClassicRockPool,
  getFallbackFoodPlan,
  getFallbackPhysics,
  getFallbackWeeklyExercise,
} from './fallbacks';
import {
  AnalyticsContent,
  ExerciseWeeklyContent,
  FoodPlanText,
  GuitarPoolItem,
  PhysicsContent,
} from '../../domains/content/types';

export type ContentType =
  | 'analytics'
  | 'transportation-physics'
  | 'classic-rock-500';

type GeneratedContentMap = {
  analytics: AnalyticsContent;
  'transportation-physics': PhysicsContent;
  'classic-rock-500': GuitarPoolItem[];
  'weekly-exercise': ExerciseWeeklyContent;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAnalyticsContent(value: unknown): value is AnalyticsContent {
  if (!isRecord(value)) return false;
  return [
    'sql',
    'dax',
    'snowflake',
    'dbt',
    'dataManagement',
    'dataQuality',
  ].every(key => key in value);
}

function isPhysicsContent(value: unknown): value is PhysicsContent {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === 'string' && typeof value.explanation === 'string'
  );
}

function isGuitarPool(value: unknown): value is GuitarPoolItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        isRecord(item) &&
        typeof item.title === 'string' &&
        typeof item.artist === 'string'
    )
  );
}

const ALLOWED_DAY_TYPES = [
  'push',
  'pull',
  'legs',
  'upper',
  'rest',
] as const;

const WEEK_DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function isExerciseDay(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.type !== 'string') return false;
  const type = value.type.toLowerCase();
  if (!(ALLOWED_DAY_TYPES as readonly string[]).includes(type)) return false;
  if (type === 'rest') return Array.isArray(value.activities);
  return Array.isArray(value.exercises);
}

function isExerciseWeeklyContent(
  value: unknown
): value is ExerciseWeeklyContent {
  if (!isRecord(value)) return false;
  return WEEK_DAYS.every(day => isExerciseDay(value[day]));
}

function getPromptForContentType(
  contentType: ContentType,
  dateKey: string
): string | null {
  switch (contentType) {
    case 'analytics':
      return getAnalyticsPrompt(dateKey);
    case 'transportation-physics':
      return getPhysicsPrompt(dateKey);
    case 'classic-rock-500':
      return getGuitarPrompt();
    default:
      return null;
  }
}

function getFallbackContent(
  contentType: ContentType
): GeneratedContentMap[ContentType] {
  switch (contentType) {
    case 'analytics':
      return getFallbackAnalytics();
    case 'transportation-physics':
      return getFallbackPhysics();
    case 'classic-rock-500':
      return getFallbackClassicRockPool();
  }
}

function validateContent<T extends ContentType>(
  contentType: T,
  parsed: unknown
): GeneratedContentMap[T] | null {
  switch (contentType) {
    case 'analytics':
      return (isAnalyticsContent(parsed) ? parsed : null) as
        | GeneratedContentMap[T]
        | null;
    case 'transportation-physics':
      return (isPhysicsContent(parsed) ? parsed : null) as
        | GeneratedContentMap[T]
        | null;
    case 'classic-rock-500':
      return (isGuitarPool(parsed) ? parsed : null) as
        | GeneratedContentMap[T]
        | null;
    default:
      return null;
  }
}

async function generateDynamicContent<T extends ContentType>(
  contentType: T,
  dateKey: string
): Promise<GeneratedContentMap[T]> {
  if (!hasApiKey) {
    return getFallbackContent(contentType) as GeneratedContentMap[T];
  }

  const prompt = getPromptForContentType(contentType, dateKey);
  if (!prompt) {
    return getFallbackContent(contentType) as GeneratedContentMap[T];
  }

  try {
    const responseText = await callPerplexityAPI(prompt, {
      model: 'sonar-pro',
      responseFormat: 'json_object',
    });

    const parsed = parseJsonResponse(responseText);
    const validated = validateContent(contentType, parsed);
    return (
      validated ?? (getFallbackContent(contentType) as GeneratedContentMap[T])
    );
  } catch (error) {
    const appError = ErrorHandler.handleApiError(
      error,
      `Content generation for ${contentType}`
    );
    ErrorHandler.logError(appError);
    return getFallbackContent(contentType) as GeneratedContentMap[T];
  }
}

export async function getOrGenerateDynamicContent<T extends ContentType>(
  userId: string,
  contentType: T,
  date: Date
): Promise<GeneratedContentMap[T]> {
  const dateKey = date.toISOString().split('T')[0];
  const cached = await getCachedContent<GeneratedContentMap[T]>(
    userId,
    contentType,
    dateKey
  );
  if (cached) return cached;

  const generated = await generateDynamicContent(contentType, dateKey);
  try {
    await saveCachedContent(userId, contentType, dateKey, generated);
  } catch (error) {
    console.error('Error saving content to Supabase cache', error);
  }
  return generated;
}

export async function getOrGeneratePlanForDate(
  userId: string,
  date: Date,
  dateKey: string
): Promise<FoodPlanText> {
  const cachedPlan = await getCachedFoodPlan(userId, dateKey);
  if (cachedPlan) return cachedPlan;

  const generatedPlan = await generateFoodPlanForDate(date);
  if (generatedPlan && !generatedPlan.startsWith('Could not generate')) {
    try {
      await saveFoodPlan(userId, dateKey, generatedPlan);
    } catch (error) {
      console.error('Error saving food plan to Supabase cache', error);
    }
  }
  return generatedPlan;
}

export async function generateFoodPlanForDate(
  date: Date
): Promise<FoodPlanText> {
  if (!hasApiKey) {
    return getFallbackFoodPlan(date);
  }

  const dayOfWeek = date.getDay();
  let prompt =
    'Create a full-day meal plan using only whole, minimally processed foods that naturally support libido. Format the output as a simple, scannable list with clear headings (Breakfast, Lunch, Dinner, Snack). Be very concise. Prioritize ingredients known to boost sexual health: oysters, leafy greens, avocados, nuts, dark chocolate, berries, watermelon, olive oil, eggs, fatty fish, ginger, cinnamon. Avoid processed foods, refined sugar, and alcohol. Do not use any markdown formatting like asterisks.';

  if (dayOfWeek === 2 || dayOfWeek === 4) {
    prompt +=
      ' Avoid all meat (including poultry and red meat), but allow seafood, eggs, and plant-based protein.';
  }

  try {
    const responseText = await callPerplexityAPI(prompt, {
      model: 'sonar-pro',
      responseFormat: 'text',
    });
    const text = responseText.replace(/\*/g, '');
    return text || 'Could not generate a food plan. The response was empty.';
  } catch (error) {
    const appError = ErrorHandler.handleApiError(error, 'Food plan generation');
    ErrorHandler.logError(appError);
    return getFallbackFoodPlan(date);
  }
}

export async function generateWeeklyExerciseContent(
  userId: string,
  startDate: Date
): Promise<ExerciseWeeklyContent> {
  const dateKey = startDate.toISOString().split('T')[0];

  const cached = await getCachedContent<ExerciseWeeklyContent>(
    userId,
    'weekly-exercise',
    dateKey
  );
  if (cached && isExerciseWeeklyContent(cached)) return cached;

  const generated = await generateWeeklyContent(startDate);
  try {
    await saveCachedContent(userId, 'weekly-exercise', dateKey, generated);
  } catch (error) {
    console.error('Error saving weekly content to Supabase cache', error);
  }
  return generated;
}

async function generateWeeklyContent(
  startDate: Date
): Promise<ExerciseWeeklyContent> {
  if (!hasApiKey) return getFallbackWeeklyExercise() as ExerciseWeeklyContent;

  const startKey = startDate.toISOString().split('T')[0];
  const prompt = `Generate a comprehensive 7-day workout plan starting from ${startKey}.

The schedule should be:
- Sunday: Rest day
- Monday: Push day (chest, shoulders, triceps)
- Tuesday: Rest day
- Wednesday: Pull day (back, biceps, rear delts)
- Thursday: Rest day
- Friday: Legs day (quads, hamstrings, glutes, calves)
- Saturday: Upper body day (combination of push and pull)

For each workout day, provide 3-4 exercises with:
- Exercise name
- Target muscle groups
- Sets and reps
- Rest periods
- Brief form instructions
- Pro tips

For rest days, suggest active recovery activities.

Focus on compound movements, progressive overload, and proper form. Make each day unique and challenging.

Return as JSON with this structure:
{
  "sunday": {"type": "rest", "activities": ["..."], "notes": "..."},
  "monday": {"type": "push", "exercises": [{"name": "...", "muscleGroups": "...", "sets": "...", "reps": "...", "rest": "...", "instructions": "...", "tips": "..."}], "notes": "..."},
  ...
}`;

  try {
    const responseText = await callPerplexityAPI(prompt, {
      model: 'sonar-pro',
      responseFormat: 'json_object',
    });
    const parsed = parseJsonResponse(responseText);
    if (isExerciseWeeklyContent(parsed)) return parsed;
    return getFallbackWeeklyExercise() as ExerciseWeeklyContent;
  } catch (error) {
    const appError = ErrorHandler.handleApiError(
      error,
      'Weekly exercise content generation'
    );
    ErrorHandler.logError(appError);
    return getFallbackWeeklyExercise() as ExerciseWeeklyContent;
  }
}

function getAnalyticsPrompt(dateKey: string): string {
  return `Generate a unique, new set of daily technical topics for an analytics engineer for the date ${dateKey}. Provide one SQL question, one DAX question, one Snowflake question, one dbt question, one explanation of a DMBOK data management concept, and one topic on data quality. For the Data Quality topic, focus on a common column data type (e.g., String, Numeric, Datetime), list 3-4 potential data quality issues found in such columns, and describe common data transformations to correct them in a big data context. Each question must include a title, a prompt/problem description, and a concise solution. The DMBOK and Data Quality explanations must have a title and a detailed explanation. Ensure the content is different from other days.

Return the response as a JSON object with this exact structure:
{
  "sql": {"title": "...", "prompt": "...", "solution": "..."},
  "dax": {"title": "...", "prompt": "...", "solution": "..."},
  "snowflake": {"title": "...", "prompt": "...", "solution": "..."},
  "dbt": {"title": "...", "prompt": "...", "solution": "..."},
  "dataManagement": {"title": "...", "explanation": "..."},
  "dataQuality": {
    "title": "...",
    "dataType": "...",
    "issues": ["...", "..."],
    "transformations": ["...", "..."]
  }
}`;
}

function getPhysicsPrompt(dateKey: string): string {
  return `For the date ${dateKey}, explain a single, fundamental physics principle behind a common mode of transportation (like a car, bike, or plane). The goal is to explain the working principle to a layman at a very conceptual level. Use simple analogies and avoid technical jargon or formulas. The topic must be unique and different from other days. For example, you could explain how airplane wings generate lift conceptually, why tires need tread, or the basic idea behind regenerative braking. Provide a title and an explanation that is extremely easy to understand for someone with no physics background.

Return as JSON:
{
  "title": "...",
  "explanation": "..."
}`;
}

function getGuitarPrompt(): string {
  return `Generate a JSON array of exactly 500 items. Each item must have two string fields: title and artist. The list should be classic rock (and closely related rock) songs that are well-known/popular for guitar learners. Keep it diverse across decades and artists; avoid duplicates. Return JSON only.

Format:
[
  {"title": "...", "artist": "..."},
  ...
]`;
}

