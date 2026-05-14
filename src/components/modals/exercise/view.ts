/**
 * Monthly calendar view for the Exercise modal.
 *
 *   ◀ May 2026 ▶
 *   Sun Mon Tue Wed Thu Fri Sat
 *    .  Push  .   Pull  .  Legs Upper        ← per-cell label
 *
 * Tap any day → expanded plan renders below. Today is outlined; the
 * actively-selected day is filled.
 */

import { createSafeHtml, escapeHtml } from '../../../utils/escapeHtml';
import { type DayPlan, type Exercise, getDayPlan, STRETCH_ROUTINES } from './data';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const TYPE_LABELS = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  rest: 'Rest',
} as const;

interface ViewState {
  displayedMonth: Date; // first day of the month being shown in the grid
  selectedDay: Date; // day whose plan appears in the panel
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
    weekday: 'long',
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

function buildMonthCells(state: ViewState): string {
  const first = state.displayedMonth;
  const monthIndex = first.getMonth();
  // Pad with empty cells before day-1 so the calendar aligns to weekdays.
  const padBefore = first.getDay();
  // 6 weeks × 7 days = 42 — guarantees a stable height as months change.
  const TOTAL_CELLS = 42;
  const cells: string[] = [];

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const offset = i - padBefore;
    const cellDate = new Date(first.getFullYear(), monthIndex, 1 + offset);
    const inMonth = cellDate.getMonth() === monthIndex;

    if (!inMonth) {
      cells.push('<div class="exercise-cal__cell exercise-cal__cell--empty" aria-hidden="true"></div>');
      continue;
    }

    const plan = getDayPlan(cellDate);
    const isToday = isSameDay(cellDate, state.today);
    const isSelected = isSameDay(cellDate, state.selectedDay);
    const classes = [
      'exercise-cal__cell',
      `exercise-cal__cell--${plan.type}`,
      isToday ? 'is-today' : '',
      isSelected ? 'is-selected' : '',
    ]
      .filter(Boolean)
      .join(' ');

    cells.push(`
      <button type="button" class="${classes}" data-date="${dateAttr(cellDate)}" aria-pressed="${isSelected}" aria-label="${escapeHtml(formatPanelDate(cellDate))}, ${TYPE_LABELS[plan.type]}">
        <span class="exercise-cal__num">${cellDate.getDate()}</span>
        <span class="exercise-cal__type">${TYPE_LABELS[plan.type]}</span>
      </button>
    `);
  }
  return cells.join('');
}

function renderExercise(exercise: Exercise, index: number): string {
  return `
    <article class="exercise-entry" aria-posinset="${index + 1}">
      <header class="exercise-entry__header">
        <h4 class="exercise-entry__name">${createSafeHtml(exercise.name)}</h4>
        <p class="exercise-entry__muscles">${createSafeHtml(exercise.muscleGroups)}</p>
      </header>
      <div class="exercise-entry__details">
        <span class="exercise-entry__detail">${escapeHtml(String(exercise.sets))} × ${escapeHtml(String(exercise.reps))}</span>
        <span class="exercise-entry__detail exercise-entry__detail--muted">${escapeHtml(String(exercise.rest))} rest</span>
      </div>
      <section class="exercise-entry__section">
        <h5 class="exercise-entry__heading">Form</h5>
        <p class="exercise-entry__body">${createSafeHtml(exercise.instructions)}</p>
      </section>
      <section class="exercise-entry__section">
        <h5 class="exercise-entry__heading">Tip</h5>
        <p class="exercise-entry__body">${createSafeHtml(exercise.tips)}</p>
      </section>
    </article>
  `;
}

function renderRestPanel(plan: DayPlan): string {
  const activities = plan.activities ?? [];
  return `
    <div class="exercise-rest">
      <p class="exercise-rest__title">Rest day.</p>
      <p class="exercise-rest__body">Recovery is when the work pays off — train hard tomorrow, today is for moving easy and refueling.</p>
      ${
        activities.length
          ? `
        <h5 class="exercise-entry__heading">Optional</h5>
        <ul class="exercise-rest__list">
          ${activities.map(a => `<li>${createSafeHtml(a)}</li>`).join('')}
        </ul>
      `
          : ''
      }
    </div>
  `;
}

function renderPanel(state: ViewState): string {
  const plan = getDayPlan(state.selectedDay);
  const dateLabel = formatPanelDate(state.selectedDay);
  const heading = `${dateLabel} · ${TYPE_LABELS[plan.type]}`;
  const body =
    plan.type === 'rest'
      ? renderRestPanel(plan)
      : `<div class="exercise-entries">${(plan.exercises ?? []).map(renderExercise).join('')}</div>`;
  return `
    <section class="exercise-panel" aria-live="polite">
      <h3 class="exercise-panel__heading">${escapeHtml(heading)}</h3>
      ${body}
    </section>
  `;
}

function renderStretchSection(): string {
  if (!STRETCH_ROUTINES.length) return '';
  const buttons = STRETCH_ROUTINES.flatMap(s => {
    if (s.urls.length === 1) {
      return `<button type="button" class="stretch-btn" data-stretch-url="${escapeHtml(s.urls[0])}" aria-label="Stretch: ${escapeHtml(s.bodyPart)}">${escapeHtml(s.bodyPart)}</button>`;
    }
    // Multiple videos — render numbered buttons
    return s.urls.map((url, i) =>
      `<button type="button" class="stretch-btn" data-stretch-url="${escapeHtml(url)}" aria-label="Stretch: ${escapeHtml(s.bodyPart)} ${i + 1}">${escapeHtml(s.bodyPart)} ${i + 1}</button>`
    );
  }).join('');
  return `
    <section class="stretch-section">
      <h3 class="stretch-section__heading">Stretch</h3>
      <div class="stretch-section__grid">${buttons}</div>
    </section>
  `;
}

function renderShell(state: ViewState): string {
  return `
    <div class="exercise-view">
      <header class="exercise-cal__header">
        <button type="button" class="exercise-cal__nav" data-nav="prev" aria-label="Previous month">←</button>
        <span class="exercise-cal__title">${escapeHtml(formatMonthTitle(state.displayedMonth))}</span>
        <button type="button" class="exercise-cal__nav" data-nav="next" aria-label="Next month">→</button>
      </header>
      <div class="exercise-cal__weekdays" aria-hidden="true">
        ${WEEKDAY_LABELS.map(l => `<span>${l}</span>`).join('')}
      </div>
      <div class="exercise-cal__grid" role="grid">
        ${buildMonthCells(state)}
      </div>
      ${renderPanel(state)}
      ${renderStretchSection()}
    </div>
  `;
}

export function renderExerciseView(container: HTMLElement, today: Date): void {
  const state: ViewState = {
    displayedMonth: startOfMonth(today),
    selectedDay: today,
    today,
  };

  function paint(): void {
    container.innerHTML = renderShell(state);
  }

  // Single delegated click handler on the container — survives every
  // re-paint and means we never need a second listener.
  container.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const navBtn = target.closest<HTMLButtonElement>('.exercise-cal__nav');
    if (navBtn) {
      const direction = navBtn.dataset.nav === 'prev' ? -1 : 1;
      const next = new Date(
        state.displayedMonth.getFullYear(),
        state.displayedMonth.getMonth() + direction,
        1
      );
      state.displayedMonth = next;
      paint();
      return;
    }

    const stretchBtn = target.closest<HTMLButtonElement>('.stretch-btn');
    if (stretchBtn) {
      const url = stretchBtn.dataset.stretchUrl;
      if (url) window.open(url, '_blank', 'noopener');
      return;
    }

    const cell = target.closest<HTMLButtonElement>('.exercise-cal__cell');
    if (cell && !cell.classList.contains('exercise-cal__cell--empty')) {
      const picked = parseDateAttr(cell.dataset.date ?? null);
      if (!picked) return;
      state.selectedDay = picked;
      paint();
    }
  });

  paint();
}
