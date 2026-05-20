import { callAI } from '../../../infra/ai/client';
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

  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (content.includes('```')) {
    jsonStr = content.replace(/```\n?/g, '');
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    throw new Error('Failed to parse translation response');
  }
}

export async function generateRandomPhrase(
  mode: TranslationMode
): Promise<string> {
  const lang = mode === 'en-to-fr' ? 'English' : 'French';

  const content = await callAI(
    `Give me one common ${lang} phrase or sentence (2-5 words) that would be useful for everyday conversation.`,
    {
      systemPrompt:
        'Provide ONLY the phrase, nothing else. No quotes, no explanations.',
      temperature: 0.9,
    }
  );

  return content.trim();
}
