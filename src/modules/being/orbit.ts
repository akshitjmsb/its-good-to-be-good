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
 * Weights; Food mounts its deterministic meal calendar. Nothing navigates or
 * leaves a durable record.
 *
 * One thing is on the stage at a time. The "Stillness" control (or
 * re-tapping the open icon) closes the stage and returns to the orbit.
 */

import './exercise.css';
import { initMeditate } from './meditate';
import { renderExerciseView } from './exercise-view';
import { STRETCH_ROUTINES } from './exercise-data';
import { escapeHtml } from '../../utils/escapeHtml';

interface PracticeLink {
  label: string;
  url: string;
}

type PillarName = 'sleep' | 'food' | 'movement' | 'mindfulness' | 'rooh';
type QuickMode = 'breathe' | 'om' | 'focus';
type Mode = PillarName | QuickMode;
type FoodRenderer = (container: HTMLElement, today: Date) => void;

interface PillarCopy {
  title: string;
  kicker: string;
  law: string;
  move: string;
  why: string;
}

const PILLAR_COPY: Record<
  Exclude<PillarName, 'food' | 'movement'>,
  PillarCopy
> = {
  sleep: {
    title: 'Sleep',
    kicker: 'The master pillar',
    law: 'Rest = refuel + flush.',
    move: 'Circadian / light: get outside within an hour of waking. At night, keep feeds and wake-ups dim and warm so the clock stays anchored.',
    why: 'Adenosine builds sleep pressure while the brain works. Deep sleep restores energy and runs the glymphatic flush. Morning light sets the circadian wave that guides temperature, hormones, alertness, and the natural afternoon dip.',
  },
  mindfulness: {
    title: 'Mindfulness',
    kicker: 'The direct control knob',
    law: 'The exhale is the brake.',
    move: 'Breathe through the nose and let the belly move: in for 4, out for 6. Choose Breathe, OM, or Focus below.',
    why: 'Breath can run automatically or manually. Fast, shallow breathing is a danger signal the brain trusts; a longer exhale gives the nervous system evidence that the body is safe.',
  },
  rooh: {
    title: 'Rooh',
    kicker: 'We regulate one another',
    law: 'Your calm becomes part of his calm.',
    move: 'Before you connect, soften the jaw, lower the shoulders, and slow one breath. Offer safety with your own body first.',
    why: 'Other people’s states enter the body-budget. A baby reads heartbeat, breath, voice, and muscle tension to answer one basic question: am I safe? Co-regulation teaches the nervous system what safety feels like.',
  },
};

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
  const closeBtn = document.getElementById('being-stage-close');
  const controls = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.orbit-icon')
  );
  if (!stage || !meditate || !panel) return;

  let openMode: Mode | null = null;

  // Flatten the body-part stretch routines into labelled links (Back → Back 1…).
  function stretchLinks(): PracticeLink[] {
    return STRETCH_ROUTINES.flatMap(entry =>
      entry.urls.length === 1
        ? [{ label: entry.bodyPart, url: entry.urls[0] }]
        : entry.urls.map((url, i) => ({
            label: `${entry.bodyPart} ${i + 1}`,
            url,
          }))
    );
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

  function renderPillarCopy(copy: PillarCopy): string {
    return `
      <section class="pillar-copy">
        <p class="pillar-copy__kicker">${escapeHtml(copy.kicker)}</p>
        <h2 class="pillar-copy__title">${escapeHtml(copy.title)}</h2>
        <p class="pillar-copy__law">${escapeHtml(copy.law)}</p>
        <div class="pillar-copy__move">
          <span>For today</span>
          <p>${escapeHtml(copy.move)}</p>
        </div>
        <details class="pillar-copy__why">
          <summary>Why this works</summary>
          <p>${escapeHtml(copy.why)}</p>
        </details>
      </section>
    `;
  }

  function movementOverview(): string {
    return `
      ${renderPillarCopy({
        title: 'Movement',
        kicker: 'Motion changes the signal',
        law: 'Long sitting, then move.',
        move: 'Use Stretch to close the tension signal, Weights to train the body, or take a low-stakes walk.',
        why: 'Working muscles release messengers that support BDNF, the brain’s growth factor. Stretching restores muscle length and blood flow; walking gives the nervous system a gentle place to practise moving forward.',
      })}
      <div class="pillar-actions" role="group" aria-label="Movement practices">
        <button type="button" class="pillar-action" data-movement="stretch">Stretch</button>
        <button type="button" class="pillar-action" data-movement="weights">Weights</button>
      </div>
    `;
  }

  function mindfulnessOverview(): string {
    const omPressed = meditation?.isOmPlaying() ?? false;
    const focusPressed = meditation?.isFocusPlaying() ?? false;
    return `
      ${renderPillarCopy(PILLAR_COPY.mindfulness)}
      <div class="pillar-actions" role="group" aria-label="Mindfulness practices">
        <button type="button" class="pillar-action" data-mode="breathe">Breathe</button>
        <button type="button" class="pillar-action" data-mode="om" aria-pressed="${omPressed}">OM</button>
        <button type="button" class="pillar-action" data-mode="focus" aria-pressed="${focusPressed}">Focus</button>
      </div>
    `;
  }

  function foodIntro(): string {
    return renderPillarCopy({
      title: 'Food',
      kicker: 'Fuel the body-budget',
      law: 'Never eat a naked carb.',
      move: 'Pair carbohydrate with protein, fat, or fibre. At lunch, eat protein and vegetables first and the carbohydrate last.',
      why: 'Glucose is fast cash, fat is slower stored energy, and protein repairs the machine. Pairing and ordering food steadies the fuel arriving in the bloodstream.',
    });
  }

  function showPanel(name: PillarName): void {
    if (!panel) return;
    panel.innerHTML = '';

    if (name === 'food') {
      // Food is a Sukoon practice: meal ticks last for this open panel only
      // and disappear when the user returns to stillness.
      panel.innerHTML = foodIntro();
      const host = document.createElement('div');
      host.className = 'pillar-embedded-view';
      panel.appendChild(host);
      renderFoodView(host, new Date());
    } else if (name === 'movement') {
      panel.innerHTML = movementOverview();
    } else if (name === 'mindfulness') {
      panel.innerHTML = mindfulnessOverview();
    } else {
      panel.innerHTML = renderPillarCopy(PILLAR_COPY[name]);
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

    // Render into a fresh host so the exercise view's delegated listener is
    // dropped with the node on the next panel swap (no listener build-up).
    const host = document.createElement('div');
    host.className = 'pillar-embedded-view';
    panel.appendChild(host);
    renderExerciseView(host, new Date());
  }

  // Reveal the stage with one face — the meditation timer or the practice
  // panel — and hide the other.
  function enter(mode: Mode): void {
    if (!stage || !meditate || !panel) return;
    const isMeditate = mode === 'breathe' || mode === 'om' || mode === 'focus';

    if (isMeditate) {
      meditate.removeAttribute('hidden');
      panel.setAttribute('hidden', '');
      panel.innerHTML = '';
    } else {
      showPanel(mode as PillarName);
      panel.removeAttribute('hidden');
      meditate.setAttribute('hidden', '');
    }

    stage.removeAttribute('hidden');
    openMode = mode;
    syncControls(mode);
    stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function close(): void {
    if (!stage || !meditate || !panel) return;
    stage.setAttribute('hidden', '');
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
