import { escapeHtml } from '../../utils/escapeHtml';
import { getStretchLinks, getStretchNow } from './exercise-data';
import { renderExerciseView } from './exercise-view';

const STRETCH_ICON = '<path d="M8 4v6l-3 4"></path><path d="m8 10 4 3 4-5"></path><path d="m12 13-1 7"></path><circle cx="8" cy="3" r="1.5"></circle>';
const WEIGHTS_ICON = '<path d="M6 9v6"></path><path d="M3 10v4"></path><path d="M18 9v6"></path><path d="M21 10v4"></path><path d="M6 12h12"></path>';

export function renderMovementView(host: HTMLElement, today: Date): void {
  const renderOverview = (): void => {
    const stretch = getStretchNow(today);
    host.innerHTML = `
      <div class="movement-now">
        <button type="button" class="pillar-action pillar-action--icon movement-now__action" ${stretch ? `data-stretch-now="${escapeHtml(stretch.url)}"` : 'data-movement="stretch"'}>
          <span class="pillar-action__glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${STRETCH_ICON}</svg></span>
          <span>Stretch Now</span>
        </button>
      </div>
      <div class="movement-alternatives" role="group" aria-label="Movement alternatives">
        <button type="button" class="pillar-action movement-alternatives__action" data-movement="weights">
          <span class="pillar-action__glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${WEIGHTS_ICON}</svg></span>
          <span>Weights</span>
        </button>
        <button type="button" class="pillar-action movement-alternatives__action" data-movement="stretch">Choose</button>
      </div>
    `;
  };

  const renderChoice = (): void => {
    host.innerHTML = `
      <button type="button" class="pillar-back" data-movement-back>← Movement</button>
      <div class="being-links" aria-label="Stretch">
        ${getStretchLinks()
          .map(link => `<button type="button" class="stretch-btn" data-link="${escapeHtml(link.url)}">${escapeHtml(link.label)}</button>`)
          .join('')}
      </div>
    `;
  };

  host.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const immediate = target?.closest<HTMLButtonElement>('[data-stretch-now]');
    if (immediate?.dataset.stretchNow) {
      window.open(immediate.dataset.stretchNow, '_blank', 'noopener');
      return;
    }
    if (target?.closest('[data-movement-back]')) {
      renderOverview();
      return;
    }
    const movement = target?.closest<HTMLButtonElement>('[data-movement]');
    if (movement?.dataset.movement === 'stretch') {
      renderChoice();
      return;
    }
    if (movement?.dataset.movement === 'weights') {
      host.innerHTML = '<button type="button" class="pillar-back" data-movement-back>← Movement</button><div data-weights></div>';
      const weights = host.querySelector<HTMLElement>('[data-weights]');
      if (weights) renderExerciseView(weights, today);
      return;
    }
    const link = target?.closest<HTMLButtonElement>('[data-link]');
    if (link?.dataset.link) window.open(link.dataset.link, '_blank', 'noopener');
  });

  renderOverview();
}
