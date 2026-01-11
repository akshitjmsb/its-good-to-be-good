/**
 * Content Generators Index
 * Orchestrates content generation and caching
 */

import { getCachedContent, saveCachedContent, getCachedFoodPlan, saveFoodPlan } from "../../core/supabase-content-cache";
import { hasApiKey, callPerplexityAPI, parseJsonResponse } from "../client";
import { ErrorHandler } from "../../utils/errorHandling";
import {
    getFallbackAnalytics,
    getFallbackPhysics,
    getFallbackFrench,
    getFallbackExercisePlan,
    getFallbackFoodPlan,
    getFallbackWeeklyExercise
} from "../fallbacks";

export type ContentType = 'analytics' | 'transportation-physics' | 'french-sound' | 'classic-rock-500' | 'exercise-plan';

// Re-export types from fallbacks for consumers
export type {
    AnalyticsContent,
    PhysicsContent,
    FrenchContent,
    FrenchWord,
    ExercisePlanContent,
    WeeklyExerciseContent
} from "../fallbacks";

// Helper function to determine workout type based on day of week
function getWorkoutType(dayOfWeek: number): string {
    const schedule = ['rest', 'push', 'rest', 'pull', 'rest', 'legs', 'upper'];
    return schedule[dayOfWeek];
}

/**
 * Get or generate dynamic content with caching
 * Returns any to maintain backward compatibility with existing modal code
 */
export async function getOrGenerateDynamicContent(
    userId: string,
    contentType: ContentType,
    date: Date
): Promise<any> {
    const dateKey = date.toISOString().split('T')[0];

    // 1. Check Supabase cache
    const cachedContent = await getCachedContent(userId, contentType, dateKey);
    if (cachedContent) {
        return cachedContent;
    }

    // 2. If not in cache, generate new content
    console.log(`Generating new content for ${contentType} on ${dateKey} as it was not found in cache.`);
    const generatedContent = await generateDynamicContent(contentType, dateKey);

    if (generatedContent) {
        // 3. Save to Supabase cache
        try {
            await saveCachedContent(userId, contentType, dateKey, generatedContent);
        } catch (e) {
            console.error("Error saving content to Supabase cache", e);
        }
    }
    return generatedContent;
}

/**
 * Generate dynamic content based on type
 */
async function generateDynamicContent(contentType: ContentType, dateKey: string): Promise<any> {
    if (!hasApiKey) {
        return getFallbackContent(contentType, dateKey);
    }

    const prompt = getPromptForContentType(contentType, dateKey);
    if (!prompt) return null;

    try {
        const responseText = await callPerplexityAPI(prompt, {
            model: 'sonar-pro',
            responseFormat: 'json_object'
        });

        return parseJsonResponse(responseText);
    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, `Content generation for ${contentType}`);
        ErrorHandler.logError(appError);
        return getFallbackContent(contentType, dateKey);
    }
}

function getPromptForContentType(contentType: ContentType, dateKey: string): string | null {
    switch (contentType) {
        case 'analytics':
            return getAnalyticsPrompt(dateKey);
        case 'transportation-physics':
            return getPhysicsPrompt(dateKey);
        case 'french-sound':
            return getFrenchPrompt(dateKey);
        case 'classic-rock-500':
            return getGuitarPrompt();
        case 'exercise-plan':
            return getExercisePrompt(dateKey);
        default:
            return null;
    }
}

function getFallbackContent(contentType: ContentType, dateKey: string): any {
    switch (contentType) {
        case 'analytics':
            return getFallbackAnalytics();
        case 'transportation-physics':
            return getFallbackPhysics();
        case 'french-sound':
            return getFallbackFrench();
        case 'exercise-plan':
            return getFallbackExercisePlan();
        default:
            return null;
    }
}

// Content-specific prompts
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

function getFrenchPrompt(dateKey: string): string {
    return `Act as a French phonetics teacher planning a long-term course. For the date ${dateKey}, create a self-contained lesson for a single, unique French phoneme. The series of lessons over many days should eventually cover all phonemes of the French language in a logical progression. The content for this single day must be unique. Provide: 1. The target sound (e.g., 'an', 'in', 'ou' or an IPA symbol). 2. A list of exactly 10 example words that use this sound. For each word, provide the French word, a simple phonetic cue for an English speaker, and its English meaning. Do not use markdown.

Return as JSON:
{
  "sound": "...",
  "words": [
    {"word": "...", "cue": "...", "meaning": "..."},
    ...
  ]
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

function getExercisePrompt(dateKey: string): string {
    const dayOfWeek = new Date(dateKey).getDay();
    const workoutType = getWorkoutType(dayOfWeek);

    return `Generate a comprehensive ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1)} workout plan for ${dateKey}. Create a 4-day weekly schedule with Push/Pull/Legs/Upper rotation. For the specific day, provide detailed exercises with proper form instructions, sets, reps, and rest periods. Focus on compound movements and progressive overload. Include muscle groups targeted and practical tips for each exercise.

Return as JSON:
{
  "push": {
    "exercises": [
      {"name": "...", "muscleGroup": "...", "sets": "...", "reps": "...", "rest": "...", "instructions": "...", "tips": "..."}
    ],
    "notes": "..."
  },
  "pull": {...},
  "legs": {...},
  "rest": {
    "activities": ["..."],
    "notes": "..."
  }
}`;
}

// Food plan generation
async function fetchServerContent(dateKey: string): Promise<{ summary?: string } | null> {
    try {
        const res = await fetch(`/api/content?date=${encodeURIComponent(dateKey)}`);
        if (!res.ok) return null;
        const json = await res.json();
        return json?.data ?? null;
    } catch (e) {
        console.warn('Server content fetch failed', e);
        return null;
    }
}

export async function getOrGeneratePlanForDate(userId: string, date: Date, dateKey: string): Promise<string> {
    // 1. Check Supabase cache
    const cachedPlan = await getCachedFoodPlan(userId, dateKey);
    if (cachedPlan) {
        return cachedPlan;
    }

    // 2. Check server KV via API (legacy fallback)
    try {
        const server = await fetchServerContent(dateKey);
        if (server && typeof server.summary === 'string') {
            await saveFoodPlan(userId, dateKey, server.summary);
            return server.summary;
        }
    } catch (e) {
        console.warn('Could not fetch from server content API.', e);
    }

    // 3. Generate new plan
    console.log(`Generating new food plan for ${dateKey} as it was not found in cache.`);
    const newPlan = await generateFoodPlanForDate(date);

    if (newPlan && !newPlan.startsWith("Could not generate")) {
        try {
            await saveFoodPlan(userId, dateKey, newPlan);
        } catch (e) {
            console.error("Error saving food plan to Supabase cache", e);
        }
    }

    return newPlan;
}

export async function generateFoodPlanForDate(date: Date): Promise<string> {
    if (!hasApiKey) {
        return getFallbackFoodPlan(date);
    }

    const dayOfWeek = date.getDay();
    let prompt = `Create a full-day meal plan using only whole, minimally processed foods that naturally support libido. Format the output as a simple, scannable list with clear headings (Breakfast, Lunch, Dinner, Snack). Be very concise. Prioritize ingredients known to boost sexual health: oysters, leafy greens, avocados, nuts, dark chocolate, berries, watermelon, olive oil, eggs, fatty fish, ginger, cinnamon. Avoid processed foods, refined sugar, and alcohol. Do not use any markdown formatting like asterisks.`;

    if (dayOfWeek === 2 || dayOfWeek === 4) {
        prompt += ' Avoid all meat (including poultry and red meat), but allow seafood, eggs, and plant-based protein.';
    }

    try {
        const responseText = await callPerplexityAPI(prompt, {
            model: 'sonar-pro',
            responseFormat: 'text'
        });
        const text = responseText.replace(/\*/g, '');
        return text || "Could not generate a food plan. The response was empty.";
    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, 'Food plan generation');
        ErrorHandler.logError(appError);
        return "Could not generate a food plan at this time.";
    }
}

// Weekly exercise content generation
export async function generateWeeklyExerciseContent(userId: string, startDate: Date): Promise<any> {
    const dateKey = startDate.toISOString().split('T')[0];

    // 1. Check Supabase cache
    const cachedContent = await getCachedContent(userId, 'weekly-exercise', dateKey);
    if (cachedContent) {
        return cachedContent;
    }

    // 2. Generate new weekly content
    console.log(`Generating new weekly exercise content starting from ${dateKey}`);
    const generatedContent = await generateWeeklyContent(startDate);

    if (generatedContent) {
        try {
            await saveCachedContent(userId, 'weekly-exercise', dateKey, generatedContent);
        } catch (e) {
            console.error("Error saving weekly content to Supabase cache", e);
        }
    }
    return generatedContent;
}

async function generateWeeklyContent(startDate: Date): Promise<any> {
    if (!hasApiKey) {
        return getFallbackWeeklyExercise();
    }

    const prompt = `Generate a comprehensive 7-day workout plan starting from ${startDate.toISOString().split('T')[0]}.

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
            responseFormat: 'json_object'
        });

        return parseJsonResponse(responseText);
    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, 'Weekly exercise content generation');
        ErrorHandler.logError(appError);
        return getFallbackWeeklyExercise();
    }
}
