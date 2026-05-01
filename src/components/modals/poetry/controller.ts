import { ai, type ResponseSchema } from '../../../infra/ai';
import { getDayOfYear } from '../../../utils/date';
import {
  loadPoetryRecents,
  recordPoetrySelection,
  savePoetryRecents,
} from '../../../infra/supabase/persistence';
import { DEFAULT_USER_ID } from '../../../core/default-user';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalContent,
  showModalError,
  showModalWithLoading,
} from '../factory';
import { PoetryMoment } from './types';
import { renderPoetryFallback, renderPoetryMoment } from './view';

function isPoetryMoment(value: unknown): value is PoetryMoment {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.scene === 'string' &&
    typeof v.couplet === 'string' &&
    typeof v.transliteration === 'string' &&
    typeof v.translation === 'string' &&
    typeof v.aboutWriter === 'string' &&
    typeof v.poet === 'string' &&
    typeof v.language === 'string'
  );
}

const RESPONSE_SCHEMA: ResponseSchema = {
  type: 'OBJECT',
  properties: {
    scene: { type: 'STRING' },
    couplet: { type: 'STRING' },
    transliteration: { type: 'STRING' },
    translation: { type: 'STRING' },
    aboutWriter: { type: 'STRING' },
    poet: { type: 'STRING' },
    language: { type: 'STRING' },
  },
  required: [
    'scene',
    'couplet',
    'transliteration',
    'translation',
    'aboutWriter',
    'poet',
    'language',
  ],
};

function buildPrompt(
  dayOfYear: number,
  recentPoets: string[],
  recentLanguages: string[]
): string {
  return `Task: Create a mini poetry moment with simple words.

Constraints:
- Pick a famous couplet from one poet in one language chosen from: Urdu, Hindi, Punjabi, English, Persian.
- Avoid using any poet in this do-not-repeat list: ${JSON.stringify(recentPoets)}
- Avoid using any language in this do-not-repeat list: ${JSON.stringify(recentLanguages)}
- Use day number ${dayOfYear} to help pick variety.

Write:
1) scene: 6–10 short sentences, present tense, simple everyday words. Place the poet clearly in their real historical era and place. Show what is happening around them that might inspire the couplet. Focus on clear, concrete details (what they see, hear, touch). End the scene right before the couplet is spoken, so the couplet feels like a natural result of the moment.
2) couplet: the exact couplet in the original script.
3) transliteration: simple romanized version.
4) translation: one or two short, plain sentences.
5) aboutWriter: 2–3 short lines about the poet.
6) poet: the poet's name.
7) language: the language of the couplet.

Rules:
- Keep language plain and readable.
- Respect the do-not-repeat lists for poet and language.
- Respond ONLY as strict JSON matching the provided schema.`;
}

export async function fetchAndShowPoetry(activeContentDate: Date) {
  const elements = getModalElements(MODAL_CONFIGS.poetry);
  if (!elements) return;

  showModalWithLoading(elements, MODAL_CONFIGS.poetry.loadingMessage);

  try {
    const dayOfYear = getDayOfYear(activeContentDate);
    const poetryRecents = await loadPoetryRecents(DEFAULT_USER_ID);
    const recentPoets = poetryRecents.map(r => r.poet).filter(Boolean);
    const recentLanguages = poetryRecents.map(r => r.language).filter(Boolean);

    const response = await ai.models.generateContent({
      model: 'sonar-pro',
      contents: buildPrompt(dayOfYear, recentPoets, recentLanguages),
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      showModalError(elements, 'Could not generate poetry at this time.');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      setModalContent(elements, renderPoetryFallback(rawText));
      return;
    }

    if (!isPoetryMoment(parsed)) {
      setModalContent(elements, renderPoetryFallback(rawText));
      return;
    }

    setModalContent(elements, renderPoetryMoment(parsed));

    const updatedRecents = recordPoetrySelection(
      poetryRecents,
      parsed.poet,
      parsed.language
    );
    await savePoetryRecents(DEFAULT_USER_ID, updatedRecents);
  } catch (error) {
    console.error('Error fetching Poetry:', error);
    showModalError(elements, 'An API Error occurred. Could not generate poetry at this time.');
  }
}
