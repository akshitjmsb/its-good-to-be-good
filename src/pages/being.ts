/**
 * Being page entry.
 *
 * Being merges two practices behind a two-tab interface:
 *   • Meditate — timer + breath UI (shared from `./meditate`).
 *   • Exercise — deterministic offline schedule (rendered from the being
 *     module's `exercise-view`).
 *
 * Both tabs mount on load. The Meditate timer owns its own intervals and
 * audio lifecycle regardless of which tab is visible; the Exercise view is
 * pure DOM and stays mounted in its (hidden) panel until selected.
 */

import { initMeditate } from './meditate';
import { renderExerciseView } from '../modules/being/exercise-view';

type TabName = 'meditate' | 'exercise';

document.addEventListener('DOMContentLoaded', () => {
  // Meditate tab — wire the timer/breath UI against its `meditate-*` ids.
  initMeditate();

  // Exercise tab — render the calendar + cards for the local "today".
  const exerciseHost = document.getElementById('being-exercise-host');
  if (exerciseHost) {
    renderExerciseView(exerciseHost, new Date());
  }

  // Tabs — show one panel at a time, keeping ARIA state in sync.
  const tabs = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.being-tab')
  );
  const panels: Record<TabName, HTMLElement | null> = {
    meditate: document.getElementById('being-panel-meditate'),
    exercise: document.getElementById('being-panel-exercise'),
  };

  function activate(name: TabName): void {
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    });
    (Object.keys(panels) as TabName[]).forEach(key => {
      const panel = panels[key];
      if (!panel) return;
      if (key === name) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab as TabName | undefined;
      if (name) activate(name);
    });
  });
});
