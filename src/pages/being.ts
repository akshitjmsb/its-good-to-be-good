/**
 * Being page entry.
 *
 * Being rests on stillness: the Vitruvian Man sits at the centre of the page
 * and every practice orbits it as a quiet captioned icon. Nothing else is on
 * screen until a practice is tapped.
 *
 * Tapping an orbit icon enters that practice on the activity stage below:
 *
 *   • Breathe / OM / Sleep reveal the meditation timer (`#being-meditate`).
 *     OM and Sleep additionally toggle their ambient loop — they keep the
 *     `meditate-om-toggle` / `meditate-sleep-toggle` ids that `initMeditate()`
 *     binds. The breath-chime toggle lives inside the timer panel.
 *   • Stretch / Weights / Tennis / Guided open the practice panel
 *     (`#being-panel`). Link practices open a YouTube routine in a new tab;
 *     Weights mounts the deterministic offline workout calendar inline.
 *
 * One thing is on the stage at a time. The "Stillness" control (or re-tapping
 * the open icon) closes the stage and returns to the orbit.
 */

import { initMeditate } from './meditate';
import { renderExerciseView } from '../modules/being/exercise-view';
import { STRETCH_ROUTINES } from '../modules/being/exercise-data';
import {
  GUIDED_MEDITATIONS,
  TENNIS_STRETCHES,
  type PracticeLink,
} from '../modules/being/practices';
import { escapeHtml } from '../utils/escapeHtml';

type PanelName = 'stretch' | 'weights' | 'tennis' | 'guided';
type MeditateMode = 'breathe' | 'om' | 'sleep';
type Mode = PanelName | MeditateMode;

document.addEventListener('DOMContentLoaded', () => {
  // Timer + breath ring + ambient audio toggles (chime / OM / Sleep).
  initMeditate();

  const stage = document.getElementById('being-stage');
  const meditate = document.getElementById('being-meditate');
  const panel = document.getElementById('being-panel');
  const closeBtn = document.getElementById('being-stage-close');
  const icons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.orbit-icon')
  );
  if (!stage || !meditate || !panel) return;

  let openMode: Mode | null = null;

  // Flatten the body-part stretch routines into labelled links (Back → Back 1…).
  function stretchLinks(): PracticeLink[] {
    return STRETCH_ROUTINES.flatMap(entry =>
      entry.urls.length === 1
        ? [{ label: entry.bodyPart, url: entry.urls[0] }]
        : entry.urls.map((url, i) => ({ label: `${entry.bodyPart} ${i + 1}`, url }))
    );
  }

  function renderLinks(title: string, links: ReadonlyArray<PracticeLink>): string {
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

  function showPanel(name: PanelName): void {
    if (!panel) return;
    panel.innerHTML = '';

    if (name === 'weights') {
      // Render into a fresh host so the exercise view's delegated listener is
      // dropped with the node on the next panel swap (no listener build-up).
      const host = document.createElement('div');
      panel.appendChild(host);
      renderExerciseView(host, new Date());
    } else if (name === 'stretch') {
      panel.innerHTML = renderLinks('Stretch', stretchLinks());
    } else if (name === 'tennis') {
      panel.innerHTML = renderLinks('Tennis stretch', TENNIS_STRETCHES);
    } else if (name === 'guided') {
      panel.innerHTML = renderLinks('Guided meditation', GUIDED_MEDITATIONS);
    }
  }

  // Reveal the stage with one face — the meditation timer or the practice
  // panel — and hide the other.
  function enter(mode: Mode): void {
    if (!stage || !meditate || !panel) return;
    const isMeditate = mode === 'breathe' || mode === 'om' || mode === 'sleep';

    if (isMeditate) {
      meditate.removeAttribute('hidden');
      panel.setAttribute('hidden', '');
      panel.innerHTML = '';
    } else {
      showPanel(mode as PanelName);
      panel.removeAttribute('hidden');
      meditate.setAttribute('hidden', '');
    }

    stage.removeAttribute('hidden');
    openMode = mode;
    syncIcons(mode);
    stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function close(): void {
    if (!stage || !meditate || !panel) return;
    stage.setAttribute('hidden', '');
    meditate.setAttribute('hidden', '');
    panel.setAttribute('hidden', '');
    panel.innerHTML = '';
    openMode = null;
    syncIcons(null);
  }

  // Mark the active orbit icon. aria-expanded for panel launchers; the
  // meditation icons carry their own aria-pressed (audio state) so we use a
  // plain `is-open` class for them.
  function syncIcons(active: Mode | null): void {
    icons.forEach(btn => {
      const mine = (btn.dataset.panel ?? btn.dataset.mode) as Mode | undefined;
      const on = mine === active;
      if (btn.hasAttribute('aria-expanded')) {
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      }
      btn.classList.toggle('is-open', on);
    });
  }

  icons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = (btn.dataset.panel ?? btn.dataset.mode) as Mode | undefined;
      if (!mode) return;

      // Re-tapping the open practice closes the stage. (For OM / Sleep the
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
    const link = target?.closest<HTMLButtonElement>('.stretch-btn[data-link]');
    if (link?.dataset.link) {
      window.open(link.dataset.link, '_blank', 'noopener');
    }
  });
});
