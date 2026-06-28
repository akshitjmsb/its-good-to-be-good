import {
  getCachedContent,
  saveCachedContent,
} from '../convex/content-cache';
import { callAI, hasProviderReady, parseJsonResponse } from './client';
import { ErrorHandler } from '../../utils/errorHandling';
import {
  getFallbackAnalytics,
  getFallbackPhysics,
} from './fallbacks';
import {
  AnalyticsContent,
  PhysicsContent,
} from '../../domains/content/types';

export type ContentType =
  | 'analytics'
  | 'transportation-physics';

type GeneratedContentMap = {
  analytics: AnalyticsContent;
  'transportation-physics': PhysicsContent;
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

function getPromptForContentType(
  contentType: ContentType,
  dateKey: string
): string | null {
  switch (contentType) {
    case 'analytics':
      return getAnalyticsPrompt(dateKey);
    case 'transportation-physics':
      return getPhysicsPrompt(dateKey);
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
    default:
      return null;
  }
}

async function generateDynamicContent<T extends ContentType>(
  contentType: T,
  dateKey: string
): Promise<GeneratedContentMap[T]> {
  if (!hasProviderReady()) {
    return getFallbackContent(contentType) as GeneratedContentMap[T];
  }

  const prompt = getPromptForContentType(contentType, dateKey);
  if (!prompt) {
    return getFallbackContent(contentType) as GeneratedContentMap[T];
  }

  try {
    const responseText = await callAI(prompt, {
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
    console.error('Error saving content to Convex cache', error);
  }
  return generated;
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
