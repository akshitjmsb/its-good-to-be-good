/**
 * Poetry module controller.
 *
 * Asks the AI provider for one famous couplet (poet + language picked
 * to avoid recent repeats), renders the scene, then persists the
 * selection so the next call avoids the same poet/language.
 *
 * `init` is the v2 entry. `fetchAndShowPoetry(date)` is the legacy
 * surface used by `modalManager.ts`.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';
import { ai } from '../../infra/ai';
import { getDayOfYear } from '../../utils/date';
import {
  loadPoetryRecents,
  recordPoetrySelection,
  savePoetryRecents,
} from '../../infra/supabase/persistence';
import { getAuthState } from '../../domains/auth/store';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalContent,
  showModalError,
  showModalWithLoading,
} from '../../core/modal-factory';
import {
  POETRY_RESPONSE_SCHEMA,
  buildPoetryPrompt,
  isPoetryMoment,
} from './data';
import { renderPoetryFallback, renderPoetryMoment } from './view';

async function generateAndPersist(
  activeContentDate: Date,
  userId: string,
  onFallback: (rawText: string) => void,
  onSuccess: (html: string) => void,
  onError: (message: string) => void
): Promise<void> {
  try {
    const dayOfYear = getDayOfYear(activeContentDate);
    const poetryRecents = await loadPoetryRecents(userId);
    const recentPoets = poetryRecents.map(r => r.poet).filter(Boolean);
    const recentLanguages = poetryRecents.map(r => r.language).filter(Boolean);

    const response = await ai.models.generateContent({
      model: 'sonar-pro',
      contents: buildPoetryPrompt(dayOfYear, recentPoets, recentLanguages),
      config: {
        responseMimeType: 'application/json',
        responseSchema: POETRY_RESPONSE_SCHEMA,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      onError('Could not generate poetry at this time.');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      onFallback(rawText);
      return;
    }

    if (!isPoetryMoment(parsed)) {
      onFallback(rawText);
      return;
    }

    onSuccess(renderPoetryMoment(parsed));

    const updatedRecents = recordPoetrySelection(
      poetryRecents,
      parsed.poet,
      parsed.language
    );
    await savePoetryRecents(userId, updatedRecents);
  } catch (error) {
    console.error('Error fetching Poetry:', error);
    onError(
      'An API Error occurred. Could not generate poetry at this time.'
    );
  }
}

export const init: ModuleController['init'] = async (ctx: ModuleContext) => {
  const active = new Date(`${ctx.today}T00:00:00`);
  const referenceDate = Number.isNaN(active.getTime()) ? new Date() : active;
  ctx.container.innerHTML = '';
  const loading = document.createElement('p');
  loading.textContent = MODAL_CONFIGS.poetry.loadingMessage ?? 'Loading…';
  ctx.container.appendChild(loading);

  await generateAndPersist(
    referenceDate,
    ctx.userId,
    rawText => {
      ctx.container.innerHTML = renderPoetryFallback(rawText);
    },
    html => {
      ctx.container.innerHTML = html;
    },
    message => {
      ctx.container.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = message;
      ctx.container.appendChild(p);
    }
  );
};

export const destroy: ModuleController['destroy'] = () => {
  // No background timers / listeners — rendering is fire-and-forget.
};

export const PoetryModule: ModuleController = { init, destroy };
export default PoetryModule;

/* ── Legacy surface used by src/components/modals/modalManager.ts ─────── */

export async function fetchAndShowPoetry(activeContentDate: Date): Promise<void> {
  const elements = getModalElements(MODAL_CONFIGS.poetry);
  if (!elements) return;

  showModalWithLoading(elements, MODAL_CONFIGS.poetry.loadingMessage);

  const userId = getAuthState().user?.id;
  if (!userId) {
    showModalError(elements, 'Sign in to read today’s poetry.');
    return;
  }

  await generateAndPersist(
    activeContentDate,
    userId,
    rawText => setModalContent(elements, renderPoetryFallback(rawText)),
    html => setModalContent(elements, html),
    message => showModalError(elements, message)
  );
}
