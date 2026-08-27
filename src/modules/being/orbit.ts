/**
 * The orbit — the home page's resting state.
 *
 * The Vitruvian Man sits at the centre of the page. The soul practices
 * orbit it on the circle as quiet captioned icons; the purpose tools sit
 * at the corners of the square as plain links to their own pages.
 *
 * Five pillars ride the Sukoon circle: Sleep, Food, Movement, Mindfulness,
 * and Rooh. Tapping one opens its content on the activity stage below.
 *
 * Breathe / OM / Focus live inside Mindfulness. Movement holds Stretch +
 * Weights; Food mounts its deterministic next-meal pointer. Nothing navigates or
 * leaves a durable record.
 *
 * One thing is on the stage at a time. The "Stillness" control (or
 * re-tapping the open icon) closes the stage and returns to the orbit.
 */

import './exercise.css';
import { initMeditate } from './meditate';
import { renderExerciseView } from './exercise-view';
import { getStretchLinks, getStretchNow } from './exercise-data';
import { escapeHtml } from '../../utils/escapeHtml';
import { initBreathReset } from './breath-reset';

interface PracticeLink {
  label: string;
  url: string;
}

type PillarName = 'sleep' | 'food' | 'movement' | 'mindfulness' | 'rooh';
type QuickMode = 'breathe' | 'om' | 'focus';
type Mode = PillarName | QuickMode;
type FoodRenderer = (container: HTMLElement, today: Date) => void;

interface ActionCue {
  label: string;
  detail: string;
  icon: string;
}

const ACTION_ICONS = {
  sunrise: '<path d="M4 18h16"></path><path d="M6 14a6 6 0 0 1 12 0"></path><path d="M12 3v3"></path><path d="m4.9 7.9 2.1 2.1"></path><path d="m19.1 7.9-2.1 2.1"></path>',
  moon: '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z"></path>',
  soften: '<path d="M7 9h10"></path><path d="M8 14c1.2 1.3 2.5 2 4 2s2.8-.7 4-2"></path><circle cx="12" cy="12" r="9"></circle>',
  breath: '<path d="M5 8h8.5a2.5 2.5 0 1 0-2.5-2.5"></path><path d="M3 12h15a3 3 0 1 1-3 3"></path><path d="M4 16h6.5a2 2 0 1 1-2 2"></path>',
  connect: '<circle cx="9" cy="8" r="3"></circle><circle cx="17" cy="9" r="2.5"></circle><path d="M3 19c.6-3.3 2.6-5 6-5s5.4 1.7 6 5"></path><path d="M15 14c3.1 0 5 1.7 5.5 5"></path>',
  stretch: '<path d="M8 4v6l-3 4"></path><path d="m8 10 4 3 4-5"></path><path d="m12 13-1 7"></path><circle cx="8" cy="3" r="1.5"></circle>',
  weights: '<path d="M6 9v6"></path><path d="M3 10v4"></path><path d="M18 9v6"></path><path d="M21 10v4"></path><path d="M6 12h12"></path>',
} as const;

export function initBeingOrbit({
  renderFoodView,
}: {
  renderFoodView: FoodRenderer;
}): void {
  // Timer + breath ring + ambient audio used by the Mindfulness practices.
  const meditation = initMeditate();

  const stage = document.getElementById('being-stage');
  const meditate = document.getElementById('being-meditate');
  const panel = document.getElementById('being-panel');
  const verse = document.querySelector<HTMLElement>('.being-verse');
  const closeBtn = document.getElementById('being-stage-close');
  const controls = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.orbit-icon')
  );
  if (!stage || !meditate || !panel) return;

  let openMode: Mode | null = null;
  const breathReset = initBreathReset({
    beforeStart: () => {
      if (meditation?.isOmPlaying()) meditation.toggleOm();
      if (meditation?.isFocusPlaying()) meditation.toggleFocus();
      close();
    },
  });

  // Flatten the body-part stretch routines into labelled links (Back → Back 1…).
  function stretchLinks(): PracticeLink[] {
    return getStretchLinks();
  }

  function renderLinks(
    title: string,
    links: ReadonlyArray<PracticeLink>
  ): string {
    const buttons = links
      .map(
        link =>
          `<button type="button" class="stretch-btn" data-link="${escapeHtml(link.url)}">${escapeHtml(link.label)}</button>`
      )
      .join('');
    return (
      `<p class="being-panel__title">${escapeHtml(title)}</p>` +
      `<div class="being-links">${buttons}</div>`
    );
  }

  function renderActionHeader(title: string, titleId: string): string {
    return `
      <h2 class="pillar-copy__title" id="${escapeHtml(titleId)}">${escapeHtml(title)}</h2>
    `;
  }

  function renderActionCues(cues: ReadonlyArray<ActionCue>): string {
    return `<div class="pillar-cues">${cues
      .map(
        cue => `
          <div class="pillar-cue">
            <span class="pillar-action__glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${cue.icon}</svg>
            </span>
            <span class="pillar-cue__copy">
              <strong>${escapeHtml(cue.label)}</strong>
              <small>${escapeHtml(cue.detail)}</small>
            </span>
          </div>
        `
      )
      .join('')}</div>`;
  }

  function sleepOverview(): string {
    return `
      <section class="pillar-action-layer" aria-labelledby="sleep-title">
        ${renderActionHeader('Sleep', 'sleep-title')}
        ${renderActionCues([
          {
            label: 'Morning light',
            detail: 'Outside within one hour',
            icon: ACTION_ICONS.sunrise,
          },
          {
            label: 'Dim the night',
            detail: 'Keep wake-ups warm and low',
            icon: ACTION_ICONS.moon,
          },
        ])}
      </section>
    `;
  }

  function movementOverview(): string {
    const stretchNow = getStretchNow(new Date());
    const stretchNowAction = stretchNow
      ? `data-stretch-now="${escapeHtml(stretchNow.url)}"`
      : 'data-movement="stretch"';
    return `
      <section class="pillar-action-layer" aria-labelledby="movement-title">
        ${renderActionHeader('Movement', 'movement-title')}
        <div class="movement-now">
          <button type="button" class="pillar-action pillar-action--icon movement-now__action" ${stretchNowAction}>
            <span class="pillar-action__glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ACTION_ICONS.stretch}</svg></span>
            <span>Stretch Now</span>
          </button>
        </div>
        <div class="movement-alternatives" role="group" aria-label="Movement alternatives">
          <button type="button" class="pillar-action movement-alternatives__action" data-movement="weights">
            <span class="pillar-action__glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ACTION_ICONS.weights}</svg></span>
            <span>Weights</span>
          </button>
          <button type="button" class="pillar-action movement-alternatives__action" data-movement="stretch">Choose</button>
        </div>
      </section>
    `;
  }

  function mindfulnessOverview(): string {
    const omPressed = meditation?.isOmPlaying() ?? false;
    const focusPressed = meditation?.isFocusPlaying() ?? false;
    return `
      <section class="pillar-action-layer" aria-labelledby="mindfulness-title">
        ${renderActionHeader('Mindfulness', 'mindfulness-title')}
        <div class="pillar-actions pillar-actions--icons" role="group" aria-label="Mindfulness practices">
          <button type="button" class="pillar-action pillar-action--icon" data-mode="breathe">
            <span class="pillar-action__glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 8h8.5a2.5 2.5 0 1 0 -2.5 -2.5"></path>
                <path d="M3 12h15a3 3 0 1 1 -3 3"></path>
                <path d="M4 16h6.5a2 2 0 1 1 -2 2"></path>
              </svg>
            </span>
            <span>Breathe</span>
          </button>
          <button type="button" class="pillar-action pillar-action--icon" data-mode="om" aria-pressed="${omPressed}">
            <span class="pillar-action__glyph pillar-action__glyph--om" aria-hidden="true">ॐ</span>
            <span>OM</span>
          </button>
          <button type="button" class="pillar-action pillar-action--icon" data-mode="focus" aria-pressed="${focusPressed}">
            <span class="pillar-action__glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="8"></circle>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </span>
            <span>Focus</span>
          </button>
        </div>
      </section>
    `;
  }

  function roohOverview(): string {
    return `
      <section class="pillar-action-layer" aria-labelledby="rooh-title">
        ${renderActionHeader('Rooh', 'rooh-title')}
        ${renderActionCues([
          {
            label: 'Soften',
            detail: 'Jaw and shoulders',
            icon: ACTION_ICONS.soften,
          },
          {
            label: 'Slow one breath',
            detail: 'Let the exhale lengthen',
            icon: ACTION_ICONS.breath,
          },
          {
            label: 'Connect',
            detail: 'Meet them from calm',
            icon: ACTION_ICONS.connect,
          },
        ])}
      </section>
    `;
  }

  function showPanel(name: PillarName): void {
    if (!panel) return;
    panel.innerHTML = '';

    if (name === 'food') {
      // Food stays in the Sukoon layer and points only to the next meal.
      panel.innerHTML = `
        <section class="pillar-action-layer" aria-labelledby="food-title">
          ${renderActionHeader('Food', 'food-title')}
        </section>
      `;
      const host = document.createElement('div');
      host.className = 'pillar-embedded-view pillar-embedded-view--action';
      panel.appendChild(host);
      renderFoodView(host, new Date());
    } else if (name === 'movement') {
      panel.innerHTML = movementOverview();
    } else if (name === 'mindfulness') {
      panel.innerHTML = mindfulnessOverview();
    } else if (name === 'sleep') {
      panel.innerHTML = sleepOverview();
    } else {
      panel.innerHTML = roohOverview();
    }
  }

  function showMovementPractice(name: 'stretch' | 'weights'): void {
    if (!panel) return;
    panel.innerHTML = `
      <button type="button" class="pillar-back" data-pillar-back="movement">← Movement</button>
    `;

    if (name === 'stretch') {
      panel.insertAdjacentHTML(
        'beforeend',
        renderLinks('Stretch', stretchLinks())
      );
      return;
    }

    const host = document.createElement('div');
    host.className = 'pillar-embedded-view';
    panel.appendChild(host);
    renderExerciseView(host, new Date());
  }

  // Reveal the stage with one face — the meditation timer or the practice
  // panel — and hide the other.
  function enter(mode: Mode): void {
    if (!stage || !meditate || !panel) return;
    breathReset?.stop();
    const isMeditate = mode === 'breathe' || mode === 'om' || mode === 'focus';

    if (isMeditate) {
      meditation?.setMode(mode as QuickMode);
      meditate.removeAttribute('hidden');
      panel.setAttribute('hidden', '');
      panel.innerHTML = '';
    } else {
      showPanel(mode as PillarName);
      panel.removeAttribute('hidden');
      meditate.setAttribute('hidden', '');
    }

    stage.removeAttribute('hidden');
    verse?.setAttribute('hidden', '');
    openMode = mode;
    syncControls(mode);
    stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function close(): void {
    if (!stage || !meditate || !panel) return;
    stage.setAttribute('hidden', '');
    verse?.removeAttribute('hidden');
    meditate.setAttribute('hidden', '');
    panel.setAttribute('hidden', '');
    panel.innerHTML = '';
    openMode = null;
    syncControls(null);
  }

  // Mark the active orbit icon. aria-expanded for panel launchers; the
  // meditation icons carry their own aria-pressed (audio state) so we use a
  // plain `is-open` class for them.
  function syncControls(active: Mode | null): void {
    const mindfulnessActive =
      active === 'breathe' || active === 'om' || active === 'focus';
    controls.forEach(btn => {
      const panelName = btn.dataset.panel as PillarName | undefined;
      const on =
        panelName === active ||
        (panelName === 'mindfulness' && mindfulnessActive);
      if (btn.hasAttribute('aria-expanded')) {
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      }
      btn.classList.toggle('is-open', on);
    });
  }

  controls.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = (btn.dataset.panel ?? btn.dataset.mode) as Mode | undefined;
      if (!mode) return;

      // Re-tapping the open practice closes the stage. (For OM / Focus the
      // ambient loop is toggled independently by initMeditate's own listener,
      // so a second tap reads as "stop and step back".)
      if (openMode === mode) {
        close();
        return;
      }
      enter(mode);
    });
  });

  closeBtn?.addEventListener('click', close);

  // Open practice links in a new tab. Scoped to the link buttons this file
  // renders (data-link); the exercise view owns its own clicks separately.
  panel.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const stretchNow = target?.closest<HTMLButtonElement>('[data-stretch-now]');
    if (stretchNow?.dataset.stretchNow) {
      window.open(stretchNow.dataset.stretchNow, '_blank', 'noopener');
      return;
    }

    const movement = target?.closest<HTMLButtonElement>('[data-movement]');
    if (
      movement?.dataset.movement === 'stretch' ||
      movement?.dataset.movement === 'weights'
    ) {
      showMovementPractice(movement.dataset.movement);
      return;
    }

    if (target?.closest<HTMLButtonElement>('[data-pillar-back="movement"]')) {
      showPanel('movement');
      return;
    }

    const quick = target?.closest<HTMLButtonElement>('[data-mode]');
    const quickMode = quick?.dataset.mode as QuickMode | undefined;
    if (quickMode) {
      if (quickMode === 'om') meditation?.toggleOm();
      if (quickMode === 'focus') meditation?.toggleFocus();
      enter(quickMode);
      return;
    }

    const link = target?.closest<HTMLButtonElement>('.stretch-btn[data-link]');
    if (link?.dataset.link) {
      window.open(link.dataset.link, '_blank', 'noopener');
    }
  });
}
