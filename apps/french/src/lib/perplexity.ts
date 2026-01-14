import { TranslationResponse, TranslationMode } from '../types';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export async function translateText(
  text: string,
  mode: TranslationMode
): Promise<TranslationResponse> {
  const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error('Perplexity API key not configured');
  }

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

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Translation request failed');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from API');
  }

  // Parse JSON from response, handling potential markdown code blocks
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

export async function generateRandomPhrase(mode: TranslationMode): Promise<string> {
  const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error('Perplexity API key not configured');
  }

  const lang = mode === 'en-to-fr' ? 'English' : 'French';

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'Provide ONLY the phrase, nothing else. No quotes, no explanations.'
        },
        {
          role: 'user',
          content: `Give me one common ${lang} phrase or sentence (2-5 words) that would be useful for everyday conversation.`
        }
      ],
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate phrase');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
