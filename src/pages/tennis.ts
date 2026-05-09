/**
 * Tennis page — long-term player development roadmap.
 *
 * Six phases from cradle (0y) to tournament player (18y), based on the
 * ITF/USTA Player Development pathway. The current phase is computed
 * from the kid's date of birth and the current date; before birth we
 * show a day countdown instead.
 */

const BIRTH_DATE = new Date('2026-06-05T00:00:00');
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PHASE_AGE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0, 2],
  [2, 5],
  [5, 7],
  [7, 10],
  [10, 14],
  [14, 18],
];

function ageInYears(now: Date, dob: Date): number {
  return (now.getTime() - dob.getTime()) / (MS_PER_DAY * 365.25);
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.ceil((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}

function activePhaseIndex(age: number): number | null {
  if (age < 0) return null;
  for (let i = 0; i < PHASE_AGE_RANGES.length; i++) {
    const [start, end] = PHASE_AGE_RANGES[i];
    if (age >= start && age < end) return i;
  }
  if (age >= PHASE_AGE_RANGES[PHASE_AGE_RANGES.length - 1][1]) {
    return PHASE_AGE_RANGES.length - 1;
  }
  return 0;
}

function formatStatus(now: Date): {
  headline: string;
  detail: string;
  activePhase: number | null;
} {
  const age = ageInYears(now, BIRTH_DATE);
  if (age < 0) {
    const days = daysBetween(BIRTH_DATE, now);
    const dayLabel = days === 1 ? 'day' : 'days';
    return {
      headline: `${days} ${dayLabel} until you arrive, little champion.`,
      detail: 'The journey starts at Phase 0 — the day you take your first breath.',
      activePhase: null,
    };
  }
  const idx = activePhaseIndex(age);
  const years = Math.floor(age);
  const months = Math.floor((age - years) * 12);
  let ageLabel: string;
  if (years === 0) {
    ageLabel = `${months} month${months === 1 ? '' : 's'} old`;
  } else if (months === 0) {
    ageLabel = `${years} year${years === 1 ? '' : 's'} old`;
  } else {
    ageLabel = `${years}y ${months}m old`;
  }
  return {
    headline: `Currently ${ageLabel}.`,
    detail: idx !== null
      ? `On the path through Phase ${idx}.`
      : 'On the path.',
    activePhase: idx,
  };
}

function applyPhaseStates(activePhase: number | null): void {
  const phases = document.querySelectorAll<HTMLElement>('.tennis-phase');
  phases.forEach((el, idx) => {
    el.classList.remove(
      'tennis-phase--past',
      'tennis-phase--active',
      'tennis-phase--future'
    );
    if (activePhase === null) {
      el.classList.add('tennis-phase--future');
      return;
    }
    if (idx < activePhase) el.classList.add('tennis-phase--past');
    else if (idx === activePhase) el.classList.add('tennis-phase--active');
    else el.classList.add('tennis-phase--future');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-container');
  if (container) container.dataset.runtime = 'tennis';

  const headlineEl = document.getElementById('tennis-status-headline');
  const detailEl = document.getElementById('tennis-status-detail');

  const status = formatStatus(new Date());
  if (headlineEl) headlineEl.textContent = status.headline;
  if (detailEl) detailEl.textContent = status.detail;
  applyPhaseStates(status.activePhase);
});
