/**
 * Coffee module controller.
 *
 * Coffee is fully offline — curated pool of recipes, no API call, no
 * external state. The `init` lifecycle renders the view into whichever
 * container the shell hands us. `showCoffeeMenu(date)` is the legacy
 * surface for the existing modal manager flow.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';
import { renderCoffeeView } from './view';

let teardownHost: (() => void) | null = null;

export const init: ModuleController['init'] = async (ctx: ModuleContext) => {
  destroy();
  const active = new Date(`${ctx.today}T00:00:00`);
  const referenceDate = Number.isNaN(active.getTime()) ? new Date() : active;
  renderCoffeeView(ctx.container, referenceDate);

  teardownHost = () => {
    ctx.container.replaceChildren();
  };
};

export const destroy: ModuleController['destroy'] = () => {
  teardownHost?.();
  teardownHost = null;
};

export const CoffeeModule: ModuleController = { init, destroy };
export default CoffeeModule;

/* ── Legacy surface used by src/components/modals/modalManager.ts ─────── */

interface LegacyModalElements {
  modal: HTMLElement;
  content: HTMLElement;
}

function getLegacyModalElements(): LegacyModalElements | null {
  if (typeof document === 'undefined') return null;
  const modal = document.getElementById('coffee-modal');
  const content = document.getElementById('coffee-content');
  if (!modal || !content) return null;
  return { modal, content };
}

export function showCoffeeMenu(date: Date): void {
  const elements = getLegacyModalElements();
  if (!elements) return;
  elements.modal.classList.remove('hidden');
  elements.modal.classList.add('flex');
  elements.content.innerHTML = '';
  renderCoffeeView(elements.content, date);
}
