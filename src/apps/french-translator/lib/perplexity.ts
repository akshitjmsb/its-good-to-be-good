import { callAI, parseJsonResponse } from '../../../infra/ai/client';
import { TranslationResponse, TranslationMode } from '../types';

export async function translateText(
  text: string,
  mode: TranslationMode
): Promise<TranslationResponse> {
  const isEnToFr = mode === 'en-to-fr';

  const systemPrompt = `You are a French language tutor.
Provide a structured JSON response for the translation.
${isEnToFr
  ? 'Translate the English text to French with phonetic pronunciation guide.'
  : 'Provide the English meaning of the French text with phonetic guide.'}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.

Structure:
{
  "full_translation": "French Phrase (phonetic-guide)",
  "english_meaning": "English Translation",
  "breakdown": [
    {"word": "French Word", "meaning": "English Meaning", "pronunciation": "phonetic"}
  ]
}`;

  const content = await callAI(text, {
    systemPrompt,
    temperature: 0.3,
    responseFormat: 'json_object',
  });

  if (!content) {
    throw new Error('No response from API');
  }

  try {
    return parseJsonResponse(content) as TranslationResponse;
  } catch {
    throw new Error('Failed to parse translation response');
  }
}

/**
 * Generate a simple everyday phrase AND its full breakdown in a single AI
 * call. Previously this fired two requests (generate, then translate); now
 * one structured response carries both the source phrase and its analysis.
 */
export async function generatePhraseWithTranslation(
  mode: TranslationMode
): Promise<{ phrase: string; response: TranslationResponse }> {
  const isEnToFr = mode === 'en-to-fr';
  const sourceLang = isEnToFr ? 'English' : 'French';

  const systemPrompt = `You are a French language tutor. Invent ONE common,
useful everyday ${sourceLang} phrase (2-5 words), then provide its full
translation breakdown. Vary your choice — greetings, food, directions,
feelings, small talk.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.

Structure:
{
  "source_text": "the ${sourceLang} phrase you invented",
  "full_translation": "French Phrase (phonetic-guide)",
  "english_meaning": "English Translation",
  "breakdown": [
    {"word": "French Word", "meaning": "English Meaning", "pronunciation": "phonetic"}
  ]
}`;

  const content = await callAI(
    `Give me one fresh, useful everyday ${sourceLang} phrase with its breakdown.`,
    {
      systemPrompt,
      temperature: 0.9,
      responseFormat: 'json_object',
    }
  );

  if (!content) {
    throw new Error('No response from API');
  }

  const parsed = parseJsonResponse(content) as TranslationResponse & {
    source_text?: string;
  };

  const phrase = isEnToFr
    ? parsed.source_text?.trim() || parsed.english_meaning
    : parsed.source_text?.trim() || parsed.full_translation;

  return { phrase, response: parsed };
}
