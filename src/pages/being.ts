/**
 * Being page entry.
 *
 * Being is one calm surface. The meditation timer rests at the top; every
 * practice — Breathe, OM, Sleep, Stretch, Weights, Tennis, Guided — lives in
 * a single dock of small captioned icons beneath it.
 *
 *   • Breathe / OM / Sleep are ambient toggles owned by `initMeditate()`
 *     (chime, OM loop, sleep loop). They keep their `meditate-*` ids.
 *   • Stretch / Weights / Tennis / Guided open an inline panel below the dock.
 *     One panel at a time; tapping the active icon closes it.
 *
 * Link practices (Stretch / Tennis / Guided) open a YouTube routine in a new
 * tab. Weights mounts the deterministic offline workout calendar inline.
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

document.addEventListener('DOMContentLoaded', () => {
  // Timer + breath ring + ambient audio toggles (Breathe / OM / Sleep).
  initMeditate();

  const panel = document.getElementById('being-panel');
  const launchers = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.being-dock__item[data-panel]')
  );
  if (!panel) return;

  let openPanel: PanelName | null = null;

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

    panel.removeAttribute('hidden');
  }

  function closePanel(): void {
    if (!panel) return;
    panel.setAttribute('hidden', '');
    panel.innerHTML = '';
  }

  function syncLaunchers(active: PanelName | null): void {
    launchers.forEach(btn =>
      btn.setAttribute(
        'aria-expanded',
        btn.dataset.panel === active ? 'true' : 'false'
      )
    );
  }

  launchers.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.panel as PanelName | undefined;
      if (!name) return;

      if (openPanel === name) {
        openPanel = null;
        syncLaunchers(null);
        closePanel();
        return;
      }

      openPanel = name;
      syncLaunchers(name);
      showPanel(name);
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

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
