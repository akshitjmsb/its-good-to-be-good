import { ai } from '../../../infra/ai';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalContent,
  showModalError,
  showModalWithLoading,
} from '../factory';
import { WorldOrderHeadlines } from './types';
import { renderWorldOrderHeadlines } from './view';

async function fetchWorldOrderHeadlines(): Promise<WorldOrderHeadlines | null> {
  const prompt =
    'Be extremely brief. First, what is the single most important, recent headline about Donald Trump? State it in 10 words or less. Then, list the 5 most critical world order headlines (US/Canada focused) as ultra-short, scannable bullet points. Finally, list the 5 latest major headlines from India in the same brief format. Do not use asterisks or any markdown formatting.';

  const response = await ai.models.generateContent({
    model: 'sonar-pro',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text ? { text: response.text } : null;
}

export async function fetchAndShowWorldOrder() {
  const elements = getModalElements(MODAL_CONFIGS.worldOrder);
  if (!elements) return;

  showModalWithLoading(elements, MODAL_CONFIGS.worldOrder.loadingMessage);

  if (!ai) {
    showModalError(elements, 'AI functionality is not available. Please check your API key configuration.');
    return;
  }

  try {
    const headlines = await fetchWorldOrderHeadlines();
    if (!headlines) {
      showModalError(elements, 'Could not retrieve any news data at this time.');
      return;
    }
    setModalContent(elements, renderWorldOrderHeadlines(headlines));
  } catch (error) {
    console.error('Error fetching World Order headlines:', error);
    showModalError(elements, 'An API Error occurred. Could not fetch headlines at this time.');
  }
}
