/**
 * Food modal — calendar + meal cards.
 *
 * Mirrors the exercise modal pattern:
 *   • Month calendar at top, nav with ‹ ›
 *   • Selected day's plan below: Breakfast / Lunch / Dinner / Snack
 *   • Veg days (Tue/Thu) get a muted-green cell variant
 *   • Per-meal check-off lasts only for the open Food practice
 */

import { createSafeHtml, escapeHtml } from '../../utils/escapeHtml';
import {
  type DayMealPlan,
  type Meal,
  type MealCategory,
  MEAL_CATEGORIES,
  getDayMealPlan,
  isVegDay,
} from './data';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

interface ViewState {
  displayedMonth: Date;
  selectedDay: Date;
  today: Date;
  checksByDate: Map<string, CheckMap>;
}

type CheckMap = Record<MealCategory, boolean>;

const EMPTY_CHECKS: CheckMap = {
  breakfast: false,
  lunch: false,
  dinner: false,
  snack: false,
};

/* ── Date helpers ──────────────────────────────────────────────────── */

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

/* ── Session-only meal check-offs ──────────────────────────────────── */

function checksFor(state: ViewState, date: Date): CheckMap {
  const key = dateAttr(date);
  const existing = state.checksByDate.get(key);
  if (existing) return existing;
  const checks = { ...EMPTY_CHECKS };
  state.checksByDate.set(key, checks);
  return checks;
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
      cells.push('<div class="food-cal__cell food-cal__cell--empty"></div>');
      continue;
    }

    const veg = isVegDay(cellDate);
    const isToday = isSameDay(cellDate, state.today);
    const isSelected = isSameDay(cellDate, state.selectedDay);
    const cls = [
      'food-cal__cell',
      veg ? 'food-cal__cell--veg' : 'food-cal__cell--regular',
      isToday ? 'is-today' : '',
      isSelected ? 'is-selected' : '',
    ]
      .filter(Boolean)
      .join(' ');

    cells.push(
      `<button type="button" class="${cls}" data-date="${dateAttr(cellDate)}" aria-pressed="${isSelected}">` +
        `<span class="food-cal__num">${cellDate.getDate()}</span>` +
        `</button>`
    );
  }
  return cells.join('');
}

/* ── Meal card ─────────────────────────────────────────────────────── */

function renderIngredients(items: string[] | undefined): string {
  if (!items || items.length === 0) return '';
  return `<p class="food-card__ingredients">${items
    .map(item => createSafeHtml(item))
    .join(' · ')}</p>`;
}

function renderMealCard(
  category: MealCategory,
  meal: Meal,
  checked: boolean
): string {
  const stateAttr = checked ? 'true' : 'false';
  const cardCls = checked ? 'food-card is-checked' : 'food-card';
  const noteHtml = meal.note
    ? `<p class="food-card__note">${createSafeHtml(meal.note)}</p>`
    : '';

  return `
    <div class="${cardCls}">
      <div class="food-card__head">
        <span class="food-card__label">${escapeHtml(CATEGORY_LABELS[category])}</span>
        <button
          type="button"
          class="food-card__check"
          data-meal="${escapeHtml(category)}"
          aria-pressed="${stateAttr}"
          aria-label="Mark ${escapeHtml(CATEGORY_LABELS[category])} ${checked ? 'unchecked' : 'eaten'}"
        >
          ${checked ? '✓' : ''}
        </button>
      </div>
      <p class="food-card__name">${createSafeHtml(meal.name)}</p>
      ${renderIngredients(meal.ingredients)}
      ${noteHtml}
    </div>
  `;
}

/* ── Day panel ─────────────────────────────────────────────────────── */

function renderPanel(state: ViewState): string {
  const plan: DayMealPlan = getDayMealPlan(state.selectedDay);
  const checks = checksFor(state, state.selectedDay);
  const dateLabel = formatPanelDate(state.selectedDay);
  const dayCls = plan.vegetarian
    ? 'food-panel__type food-panel__type--veg'
    : 'food-panel__type';
  const dayLabel = plan.vegetarian ? 'Vegetarian' : 'Regular';

  const cards = MEAL_CATEGORIES.map(category =>
    renderMealCard(category, plan.meals[category], checks[category])
  ).join('');

  return `
    <section class="food-panel" aria-live="polite">
      <div class="food-panel__head">
        <span class="food-panel__date">${escapeHtml(dateLabel)}</span>
        <span class="${dayCls}">${dayLabel}</span>
      </div>
      <div class="food-cards">${cards}</div>
    </section>
  `;
}

/* ── Shell ─────────────────────────────────────────────────────────── */

function renderShell(state: ViewState): string {
  return `
    <div class="food-view">
      <header class="food-cal__header">
        <button type="button" class="food-cal__nav" data-nav="prev" aria-label="Previous month">‹</button>
        <span class="food-cal__title">${escapeHtml(formatMonthTitle(state.displayedMonth))}</span>
        <button type="button" class="food-cal__nav" data-nav="next" aria-label="Next month">›</button>
      </header>
      <div class="food-cal__weekdays">
        ${WEEKDAY_LABELS.map(l => `<span>${l}</span>`).join('')}
      </div>
      <div class="food-cal__grid">
        ${buildMonthCells(state)}
      </div>
      ${renderPanel(state)}
    </div>
  `;
}

/* ── Entry point ───────────────────────────────────────────────────── */

/**
 * State is held in a module-scoped map keyed by container so reopens of
 * the modal swap in a fresh state without re-binding listeners (and
 * without duplicate listeners stacking, which would double-fire the
 * non-idempotent check-off toggle).
 */
const STATE = new WeakMap<HTMLElement, ViewState>();
const LISTENER_ATTR = 'data-food-view-attached';

function attachListener(container: HTMLElement): void {
  if (container.getAttribute(LISTENER_ATTR) === 'true') return;
  container.setAttribute(LISTENER_ATTR, 'true');

  const paint = (): void => {
    const state = STATE.get(container);
    if (!state) return;
    container.innerHTML = renderShell(state);
  };

  container.addEventListener('click', event => {
    const state = STATE.get(container);
    if (!state) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const navBtn = target.closest<HTMLButtonElement>('.food-cal__nav');
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

    const checkBtn = target.closest<HTMLButtonElement>('.food-card__check');
    if (checkBtn) {
      const category = checkBtn.dataset.meal as MealCategory | undefined;
      if (!category) return;
      const checks = checksFor(state, state.selectedDay);
      checks[category] = !checks[category];
      paint();
      return;
    }

    const cell = target.closest<HTMLButtonElement>('.food-cal__cell');
    if (cell && !cell.classList.contains('food-cal__cell--empty')) {
      const picked = parseDateAttr(cell.dataset.date ?? null);
      if (!picked) return;
      state.selectedDay = picked;
      paint();
    }
  });
}

export function renderFoodView(container: HTMLElement, today: Date): void {
  STATE.set(container, {
    displayedMonth: startOfMonth(today),
    selectedDay: today,
    today,
    checksByDate: new Map(),
  });
  attachListener(container);
  container.innerHTML = renderShell(STATE.get(container)!);
}
