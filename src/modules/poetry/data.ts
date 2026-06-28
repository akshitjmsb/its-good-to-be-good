/**
 * Poetry data helpers — prompt construction and JSON-shape narrowing.
 * The actual recents persistence stays in `infra/convex/persistence`;
 * this file just owns the prompt + parse contract.
 */

import type { ResponseSchema } from '../../infra/ai';
import type { PoetryMoment } from './types';

export const POETRY_RESPONSE_SCHEMA: ResponseSchema = {
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

export function isPoetryMoment(value: unknown): value is PoetryMoment {
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

export function buildPoetryPrompt(
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
