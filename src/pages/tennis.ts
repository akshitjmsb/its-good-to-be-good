/**
 * Tennis page — dynamic status overlay on top of the static phase
 * timeline rendered in tennis.html.
 *
 * Pre-birth: shows a live d/h/m/s countdown to BIRTH_DATE.
 * Post-birth: highlights the current phase based on the kid's age in
 * years, and labels the past / current / future phases via class names
 * the stylesheet uses to dim or lift each card.
 */

const BIRTH_DATE = new Date('2026-06-05T00:00:00');

// [startInclusive, endExclusive] in years. Last phase is open-ended at
// the top so anyone older than 18 still sees Phase 5 highlighted.
const PHASE_AGE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0, 2],
  [2, 5],
  [5, 7],
  [7, 10],
  [10, 14],
  [14, Number.POSITIVE_INFINITY],
];

function ageInYears(now: Date, dob: Date): number {
  return (now.getTime() - dob.getTime()) / (365.2425 * 24 * 3600 * 1000);
}

function activePhaseIndex(age: number): number {
  if (age < 0) return -1;
  for (let i = 0; i < PHASE_AGE_RANGES.length; i++) {
    const [start, end] = PHASE_AGE_RANGES[i];
    if (age >= start && age < end) return i;
  }
  return PHASE_AGE_RANGES.length - 1;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function applyPhaseStates(activeIdx: number): void {
  const phases = document.querySelectorAll<HTMLElement>('.tennis-phase');
  phases.forEach((node, i) => {
    node.classList.remove(
      'tennis-phase--past',
      'tennis-phase--active',
      'tennis-phase--future',
    );
    if (activeIdx === -1) {
      node.classList.add('tennis-phase--future');
      return;
    }
    if (i < activeIdx) node.classList.add('tennis-phase--past');
    else if (i === activeIdx) node.classList.add('tennis-phase--active');
    else node.classList.add('tennis-phase--future');
  });
}

function updateStatus(now: Date): void {
  const countdown = document.getElementById('tennis-status-countdown');
  const headline = document.getElementById('tennis-status-headline');
  const detail = document.getElementById('tennis-status-detail');
  if (!countdown || !headline || !detail) return;

  const diffMs = BIRTH_DATE.getTime() - now.getTime();

  if (diffMs > 0) {
    countdown.hidden = false;
    headline.textContent = 'Until the little champion arrives —';
    detail.textContent = 'Foundation phase begins on day one.';

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const setCell = (key: string, value: string) => {
      const cell = countdown.querySelector<HTMLElement>(`[data-cd="${key}"]`);
      if (cell) cell.textContent = value;
    };
    setCell('d', days.toString());
    setCell('h', pad(hours));
    setCell('m', pad(mins));
    setCell('s', pad(secs));
    return;
  }

  countdown.hidden = true;

  const age = ageInYears(now, BIRTH_DATE);
  const idx = activePhaseIndex(age);
  const phase = document.querySelector<HTMLElement>(
    `.tennis-phase[data-phase="${idx}"]`,
  );
  const name = phase?.querySelector<HTMLElement>('.tennis-phase__name')?.textContent ?? '';
  const ageYears = Math.max(0, Math.floor(age));

  headline.textContent = `Age ${ageYears} · Phase ${idx} — ${name}.`;
  detail.textContent = 'Stay the course. The court is patient.';
}

function tick(): void {
  const now = new Date();
  updateStatus(now);
  applyPhaseStates(activePhaseIndex(ageInYears(now, BIRTH_DATE)));
}

function init(): void {
  const container = document.getElementById('app-container');
  if (container) container.dataset.runtime = 'tennis';

  tick();

  const interval = BIRTH_DATE.getTime() > Date.now() ? 1000 : 60_000;
  window.setInterval(tick, interval);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
