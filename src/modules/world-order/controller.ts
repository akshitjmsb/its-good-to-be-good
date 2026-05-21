/**
 * World Order module controller.
 *
 * Fetches a compact rundown of recent headlines from the configured AI
 * provider (web-search-capable) and drops it into the host container.
 * The `init` lifecycle is the v2 entry point; `fetchAndShowWorldOrder`
 * is the legacy surface still wired into `modalManager.ts`.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';
import { ai } from '../../infra/ai';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalContent,
  showModalError,
  showModalWithLoading,
} from '../../core/modal-factory';
import type { WorldOrderHeadlines } from './types';
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

async function renderInto(container: HTMLElement): Promise<void> {
  if (!ai) {
    container.innerHTML = '';
    const p = document.createElement('p');
    p.textContent =
      'AI functionality is not available. Please check your API key configuration.';
    container.appendChild(p);
    return;
  }

  try {
    const headlines = await fetchWorldOrderHeadlines();
    if (!headlines) {
      container.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = 'Could not retrieve any news data at this time.';
      container.appendChild(p);
      return;
    }
    container.innerHTML = renderWorldOrderHeadlines(headlines);
  } catch (error) {
    console.error('Error fetching World Order headlines:', error);
    container.innerHTML = '';
    const p = document.createElement('p');
    p.textContent =
      'An API Error occurred. Could not fetch headlines at this time.';
    container.appendChild(p);
  }
}

export const init: ModuleController['init'] = async (ctx: ModuleContext) => {
  await renderInto(ctx.container);
};

export const destroy: ModuleController['destroy'] = () => {
  // No timers, no listeners — render is fire-and-forget.
};

export const WorldOrderModule: ModuleController = { init, destroy };
export default WorldOrderModule;

/* ── Legacy surface used by src/components/modals/modalManager.ts ─────── */

export async function fetchAndShowWorldOrder(): Promise<void> {
  const elements = getModalElements(MODAL_CONFIGS.worldOrder);
  if (!elements) return;

  showModalWithLoading(elements, MODAL_CONFIGS.worldOrder.loadingMessage);

  if (!ai) {
    showModalError(
      elements,
      'AI functionality is not available. Please check your API key configuration.'
    );
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
    showModalError(
      elements,
      'An API Error occurred. Could not fetch headlines at this time.'
    );
  }
}
