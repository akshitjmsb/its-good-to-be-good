import { callAI, parseJsonResponse } from '../../../infra/ai/client';
import { WordOfDay } from '../types';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Difficulty ramps with how many words the learner has banked. The first
 * dozen stay in everyday-survival territory; past that we open up to richer
 * vocabulary and idiom.
 */
export function difficultyForCount(learnedCount: number): Difficulty {
  if (learnedCount < 12) return 'beginner';
  if (learnedCount < 40) return 'intermediate';
  return 'advanced';
}

const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  beginner:
    'Choose a very common, practical word — greetings, food, directions, ' +
    'numbers, emotions, or daily-life basics. Keep it concrete and useful.',
  intermediate:
    'Choose a useful everyday word a learner meets after the basics — ' +
    'common verbs, connectors, feelings, work, travel, or social situations.',
  advanced:
    'Choose a richer or more nuanced word — idiomatic expressions, ' +
    'precise verbs, abstract nouns, or culturally distinctive vocabulary.',
};

/**
 * Generate the daily French word. The prompt is told which words the learner
 * already has so it never repeats, and the difficulty scales with progress.
 *
 * Pure I/O — caching lives in the hook so this stays trivially testable.
 */
export async function generateWordOfDay(
  learnedWords: string[],
  learnedCount: number
): Promise<WordOfDay> {
  const difficulty = difficultyForCount(learnedCount);

  // Cap the avoid-list so the prompt stays bounded as history grows.
  const avoid = learnedWords.slice(0, 80);
  const avoidLine = avoid.length
    ? `Do NOT pick any of these already-learned words: ${avoid.join(', ')}.`
    : 'This is the learner’s first word.';

  const systemPrompt = `You are a warm, precise French tutor crafting a
"word of the day" for an English speaker. ${DIFFICULTY_GUIDANCE[difficulty]}
${avoidLine}

Return ONLY valid JSON, no markdown, no code blocks. Use this exact shape:
{
  "word": "the French word, lowercase unless a proper noun",
  "pronunciation": "phonetic guide an English speaker can read, e.g. bon-ZHOOR",
  "meaning": "concise English meaning",
  "grammar": "gender for a noun (nm/nf), conjugation group for a verb, or part of speech",
  "examples": [
    {"french": "French sentence using the word", "english": "English translation"},
    {"french": "a second, different context", "english": "translation"},
    {"french": "a third, different context", "english": "translation"}
  ],
  "note": "one short 'did you know' cultural note or etymology tidbit"
}

Exactly 3 examples, each showing a different use of the word.`;

  const content = await callAI('Give me today’s French word of the day.', {
    systemPrompt,
    temperature: 0.8,
    responseFormat: 'json_object',
  });

  if (!content) {
    throw new Error('No response from API');
  }

  const parsed = parseJsonResponse(content) as WordOfDay;

  if (!parsed?.word || !Array.isArray(parsed.examples)) {
    throw new Error('Malformed word-of-the-day response');
  }

  return parsed;
}
