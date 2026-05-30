/**
 * Exercise modal — minimal calendar + muscle-focus chips + compact cards.
 *
 * Redesign principles:
 *   • Show what matters at a glance: muscles targeted, sets × reps
 *   • Form/tips hidden by default, tap to expand
 *   • Muscle focus chips: primary (filled) vs secondary (outlined)
 *   • Stretch section at bottom
 */

import { createSafeHtml, escapeHtml } from '../../utils/escapeHtml';
import {
  type DayPlan,
  type Exercise,
  type WorkoutType,
  getDayPlan,
  MUSCLE_FOCUS,
  STRETCH_ROUTINES,
} from './exercise-data';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const TYPE_LABELS: Record<WorkoutType, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  rest: 'Rest',
};

interface ViewState {
  displayedMonth: Date;
  selectedDay: Date;
  today: Date;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMonthTitle(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function formatPanelDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function dateAttr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateAttr(value: string | null): Date | null {
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if ([y, m, d].some(n => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d);
}

/* ── Calendar ──────────────────────────────────────────────────────── */

function buildMonthCells(state: ViewState): string {
  const first = state.displayedMonth;
  const monthIndex = first.getMonth();
  const padBefore = first.getDay();
  const TOTAL_CELLS = 42;
  const cells: string[] = [];

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const offset = i - padBefore;
    const cellDate = new Date(first.getFullYear(), monthIndex, 1 + offset);
    const inMonth = cellDate.getMonth() === monthIndex;

    if (!inMonth) {
      cells.push('<div class="ex-cal__cell ex-cal__cell--empty"></div>');
      continue;
    }

    const plan = getDayPlan(cellDate);
    const isToday = isSameDay(cellDate, state.today);
    const isSelected = isSameDay(cellDate, state.selectedDay);
    const cls = [
      'ex-cal__cell',
      `ex-cal__cell--${plan.type}`,
      isToday ? 'is-today' : '',
      isSelected ? 'is-selected' : '',
    ].filter(Boolean).join(' ');

    cells.push(
      `<button type="button" class="${cls}" data-date="${dateAttr(cellDate)}" aria-pressed="${isSelected}">` +
        `<span class="ex-cal__num">${cellDate.getDate()}</span>` +
      `</button>`
    );
  }
  return cells.join('');
}

/* ── Muscle focus chips ────────────────────────────────────────────── */

function renderMuscleFocus(type: Exclude<WorkoutType, 'rest'>): string {
  const groups = MUSCLE_FOCUS[type];
  const chips = groups.map(g => {
    const cls = g.role === 'primary' ? 'ex-chip ex-chip--primary' : 'ex-chip ex-chip--secondary';
    return `<span class="${cls}">${escapeHtml(g.name)}</span>`;
  }).join('');
  return `<div class="ex-focus">${chips}</div>`;
}

/* ── Exercise card (minimal) ───────────────────────────────────────── */

function renderExercise(exercise: Exercise, index: number): string {
  const id = `ex-detail-${index}`;
  return `
    <div class="ex-card">
      <div class="ex-card__row">
        <div class="ex-card__left">
          <span class="ex-card__name">${createSafeHtml(exercise.name)}</span>
          <span class="ex-card__muscles">${createSafeHtml(exercise.muscleGroups)}</span>
        </div>
        <span class="ex-card__rx">${escapeHtml(String(exercise.sets))}×${escapeHtml(String(exercise.reps))}</span>
      </div>
      <details class="ex-card__details" id="${id}">
        <summary class="ex-card__toggle">How to</summary>
        <p class="ex-card__text">${createSafeHtml(exercise.instructions)}</p>
        <p class="ex-card__tip">${createSafeHtml(exercise.tips)}</p>
      </details>
    </div>
  `;
}

/* ── Day panel ─────────────────────────────────────────────────────── */

function renderRestPanel(plan: DayPlan): string {
  const activities = plan.activities ?? [];
  return `
    <div class="ex-rest">
      <p class="ex-rest__label">Rest day</p>
      ${activities.length
        ? `<ul class="ex-rest__list">${activities.map(a => `<li>${createSafeHtml(a)}</li>`).join('')}</ul>`
        : ''}
    </div>
  `;
}

function renderPanel(state: ViewState): string {
  const plan = getDayPlan(state.selectedDay);
  const dateLabel = formatPanelDate(state.selectedDay);

  if (plan.type === 'rest') {
    return `
      <section class="ex-panel" aria-live="polite">
        <div class="ex-panel__head">
          <span class="ex-panel__date">${escapeHtml(dateLabel)}</span>
          <span class="ex-panel__type ex-panel__type--rest">Rest</span>
        </div>
        ${renderRestPanel(plan)}
      </section>
    `;
  }

  const exercises = plan.exercises ?? [];
  return `
    <section class="ex-panel" aria-live="polite">
      <div class="ex-panel__head">
        <span class="ex-panel__date">${escapeHtml(dateLabel)}</span>
        <span class="ex-panel__type">${TYPE_LABELS[plan.type]}</span>
      </div>
      ${renderMuscleFocus(plan.type)}
      <div class="ex-cards">${exercises.map(renderExercise).join('')}</div>
    </section>
  `;
}

/* ── Stretch section ───────────────────────────────────────────────── */

function renderStretchSection(): string {
  if (!STRETCH_ROUTINES.length) return '';
  const buttons = STRETCH_ROUTINES.flatMap(s => {
    if (s.urls.length === 1) {
      return `<button type="button" class="stretch-btn" data-stretch-url="${escapeHtml(s.urls[0])}">${escapeHtml(s.bodyPart)}</button>`;
    }
    return s.urls.map((url, i) =>
      `<button type="button" class="stretch-btn" data-stretch-url="${escapeHtml(url)}">${escapeHtml(s.bodyPart)} ${i + 1}</button>`
    );
  }).join('');
  return `
    <section class="ex-stretch">
      <span class="ex-stretch__label">Stretch</span>
      <div class="ex-stretch__row">${buttons}</div>
    </section>
  `;
}

/* ── Shell ─────────────────────────────────────────────────────────── */

function renderShell(state: ViewState): string {
  return `
    <div class="ex-view">
      <header class="ex-cal__header">
        <button type="button" class="ex-cal__nav" data-nav="prev" aria-label="Previous month">‹</button>
        <span class="ex-cal__title">${escapeHtml(formatMonthTitle(state.displayedMonth))}</span>
        <button type="button" class="ex-cal__nav" data-nav="next" aria-label="Next month">›</button>
      </header>
      <div class="ex-cal__weekdays">
        ${WEEKDAY_LABELS.map(l => `<span>${l}</span>`).join('')}
      </div>
      <div class="ex-cal__grid">
        ${buildMonthCells(state)}
      </div>
      ${renderPanel(state)}
      ${renderStretchSection()}
    </div>
  `;
}

/* ── Entry point ───────────────────────────────────────────────────── */

export function renderExerciseView(container: HTMLElement, today: Date): void {
  const state: ViewState = {
    displayedMonth: startOfMonth(today),
    selectedDay: today,
    today,
  };

  function paint(): void {
    container.innerHTML = renderShell(state);
  }

  container.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const navBtn = target.closest<HTMLButtonElement>('.ex-cal__nav');
    if (navBtn) {
      const dir = navBtn.dataset.nav === 'prev' ? -1 : 1;
      state.displayedMonth = new Date(
        state.displayedMonth.getFullYear(),
        state.displayedMonth.getMonth() + dir,
        1
      );
      paint();
      return;
    }

    const stretchBtn = target.closest<HTMLButtonElement>('.stretch-btn');
    if (stretchBtn) {
      const url = stretchBtn.dataset.stretchUrl;
      if (url) window.open(url, '_blank', 'noopener');
      return;
    }

    const cell = target.closest<HTMLButtonElement>('.ex-cal__cell');
    if (cell && !cell.classList.contains('ex-cal__cell--empty')) {
      const picked = parseDateAttr(cell.dataset.date ?? null);
      if (!picked) return;
      state.selectedDay = picked;
      paint();
    }
  });

  paint();
}
