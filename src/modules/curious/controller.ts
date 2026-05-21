/**
 * Curious module controller (legacy: "Under the Hood" / hoodModal).
 *
 * Pulls a daily physics deep-dive from the content service and drops the
 * sanitised explanation into the modal. `init` is the v2 entry;
 * `showHoodModal(date)` is the legacy surface still mapped in
 * `modalManager.ts` under handler name `showHoodModal`.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';
import { getPhysicsContent } from '../../domains/content/service';
import { getAuthState } from '../../domains/auth/store';
import { createSafeHtml } from '../../utils/escapeHtml';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalContent,
  setModalTitle,
  showModalError,
  showModalWithLoading,
} from '../../core/modal-factory';

async function renderInto(
  container: HTMLElement,
  userId: string,
  date: Date,
  setTitle: (title: string) => void
): Promise<void> {
  try {
    const data = await getPhysicsContent(userId, date);
    if (!data || !data.title || !data.explanation) {
      setTitle('Error');
      container.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = 'Content is not available. Please try again later.';
      container.appendChild(p);
      return;
    }

    setTitle(`Under the Hood: ${data.title}`);
    container.innerHTML = createSafeHtml(data.explanation, { maxLength: 12000 });
  } catch (error) {
    console.error('Error showing under the hood modal:', error);
    setTitle('Error');
    container.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = 'An error occurred while fetching content.';
    container.appendChild(p);
  }
}

export const init: ModuleController['init'] = async (ctx: ModuleContext) => {
  const active = new Date(`${ctx.today}T00:00:00`);
  const referenceDate = Number.isNaN(active.getTime()) ? new Date() : active;
  ctx.container.innerHTML = '';
  const loading = document.createElement('p');
  loading.textContent = MODAL_CONFIGS.hood.loadingMessage ?? 'Loading topic...';
  ctx.container.appendChild(loading);

  await renderInto(ctx.container, ctx.userId, referenceDate, () => {
    // v2 surface doesn't own the title bar — the shell does.
  });
};

export const destroy: ModuleController['destroy'] = () => {
  // No long-lived listeners — render is fire-and-forget.
};

export const CuriousModule: ModuleController = { init, destroy };
export default CuriousModule;

/* ── Legacy surface used by src/components/modals/modalManager.ts ─────── */

export async function showHoodModal(date: Date): Promise<void> {
  const elements = getModalElements(MODAL_CONFIGS.hood);
  if (!elements) return;

  showModalWithLoading(elements, MODAL_CONFIGS.hood.loadingMessage);
  setModalTitle(elements, 'Under the Hood');

  const userId = getAuthState().user?.id;
  if (!userId) {
    setModalTitle(elements, 'Sign in required');
    showModalError(elements, 'Sign in to read today’s deep-dive.');
    return;
  }

  try {
    const data = await getPhysicsContent(userId, date);

    if (!data || !data.title || !data.explanation) {
      setModalTitle(elements, 'Error');
      showModalError(elements, 'Content is not available. Please try again later.');
      return;
    }

    setModalTitle(elements, `Under the Hood: ${data.title}`);
    setModalContent(
      elements,
      createSafeHtml(data.explanation, { maxLength: 12000 })
    );
  } catch (error) {
    console.error('Error showing under the hood modal:', error);
    setModalTitle(elements, 'Error');
    showModalError(elements, 'An error occurred while fetching content.');
  }
}
