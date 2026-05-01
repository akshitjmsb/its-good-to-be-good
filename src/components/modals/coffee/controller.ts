import { ai, type ResponseSchema } from '../../../infra/ai';
import { getDayOfYear } from '../../../utils/date';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalContent,
  showModalError,
  showModalWithLoading,
} from '../factory';
import { CoffeeLesson } from './types';
import { renderCoffeeLesson } from './view';

function isCoffeeLesson(value: unknown): value is CoffeeLesson {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === 'string' &&
    typeof v.explanation === 'string' &&
    typeof v.takeaway === 'string'
  );
}

async function fetchCoffeeLesson(activeContentDate: Date): Promise<CoffeeLesson | null> {
  if (!ai) return null;

  const dayOfYear = getDayOfYear(activeContentDate);
  const prompt = `For day ${dayOfYear} of the year, generate a unique, self-contained mini-lesson for someone aspiring to open their own coffee cafe. The lesson should cover a practical aspect of the coffee industry, market, or business operations. Provide a clear title, a detailed but accessible explanation, and a single key takeaway for a future cafe owner. Do not use asterisks or markdown.`;

  const responseSchema: ResponseSchema = {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING', description: 'The title of the coffee industry lesson.' },
      explanation: { type: 'STRING', description: 'A detailed explanation of the topic.' },
      takeaway: { type: 'STRING', description: 'A single, actionable takeaway for a future cafe owner.' },
    },
    required: ['title', 'explanation', 'takeaway'],
  };

  const response = await ai.models.generateContent({
    model: 'sonar-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  const parsed = JSON.parse(response.text);
  return isCoffeeLesson(parsed) ? parsed : null;
}

export async function fetchAndShowCoffeeTip(activeContentDate: Date) {
  const elements = getModalElements(MODAL_CONFIGS.coffee);
  if (!elements) return;

  showModalWithLoading(elements, MODAL_CONFIGS.coffee.loadingMessage);

  if (!ai) {
    showModalError(elements, 'AI functionality is not available. Please check your API key configuration.');
    return;
  }

  try {
    const lesson = await fetchCoffeeLesson(activeContentDate);
    if (!lesson) {
      showModalError(elements, 'Could not retrieve a coffee lesson. The response was empty.');
      return;
    }
    setModalContent(elements, renderCoffeeLesson(lesson));
  } catch (error) {
    console.error('Error fetching Coffee Lesson:', error);
    showModalError(elements, 'Could not retrieve a coffee lesson at this time.');
  }
}
