/**
 * Food practice — one useful decision at a time.
 *
 * The current meal leads. A compact day switcher preserves lightweight
 * planning, while the rest of the day's meals stay behind one disclosure.
 * Check-offs live only for the open Food practice.
 */

import { createSafeHtml, escapeHtml } from '../../utils/escapeHtml';
import {
  type DayMealPlan,
  type Meal,
  type MealCategory,
  MEAL_CATEGORIES,
  getDayMealPlan,
} from './data';

const CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

const DAY_ORDER: ReadonlyArray<MealCategory> = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
];

interface ViewState {
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

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDay(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function checksFor(state: ViewState, date: Date): CheckMap {
  const key = dateKey(date);
  const existing = state.checksByDate.get(key);
  if (existing) return existing;
  const checks = { ...EMPTY_CHECKS };
  state.checksByDate.set(key, checks);
  return checks;
}

/** The meal window is deliberately broad; this is a cue, not a schedule. */
export function mealCategoryForHour(hour: number): MealCategory {
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

function featuredCategory(state: ViewState, checks: CheckMap): MealCategory {
  if (!isSameDay(state.selectedDay, state.today)) return 'breakfast';

  const current = mealCategoryForHour(state.today.getHours());
  const start = DAY_ORDER.indexOf(current);
  return (
    DAY_ORDER.slice(start).find(category => !checks[category]) ?? current
  );
}

function renderIngredients(meal: Meal): string {
  if (!meal.ingredients?.length) return '';
  return `<p class="food-meal__ingredients">${meal.ingredients
    .map(item => createSafeHtml(item))
    .join(' · ')}</p>`;
}

function renderCheck(
  category: MealCategory,
  checked: boolean,
  label: string
): string {
  return `
    <button
      type="button"
      class="food-check"
      data-meal="${escapeHtml(category)}"
      aria-pressed="${checked}"
      aria-label="Mark ${escapeHtml(label)} ${checked ? 'not eaten' : 'eaten'}"
    >
      <span aria-hidden="true">${checked ? '✓' : ''}</span>
      <span>${checked ? 'Eaten' : 'Mark eaten'}</span>
    </button>
  `;
}

function renderFeaturedMeal(
  category: MealCategory,
  meal: Meal,
  checked: boolean
): string {
  const label = CATEGORY_LABELS[category];
  return `
    <section class="food-next${checked ? ' is-checked' : ''}" aria-labelledby="food-next-title">
      <p class="food-next__eyebrow">Up next · ${escapeHtml(label)}</p>
      <h3 class="food-next__name" id="food-next-title">${createSafeHtml(meal.name)}</h3>
      ${renderIngredients(meal)}
      ${meal.note ? `<p class="food-next__note">${createSafeHtml(meal.note)}</p>` : ''}
      <div class="food-next__footer">
        <p><span>Order</span> protein + veg first · carb last</p>
        ${renderCheck(category, checked, label)}
      </div>
    </section>
  `;
}

function renderMealRow(
  category: MealCategory,
  meal: Meal,
  checked: boolean
): string {
  const label = CATEGORY_LABELS[category];
  return `
    <div class="food-meal${checked ? ' is-checked' : ''}">
      <div class="food-meal__copy">
        <span class="food-meal__label">${escapeHtml(label)}</span>
        <p class="food-meal__name">${createSafeHtml(meal.name)}</p>
      </div>
      ${renderCheck(category, checked, label)}
    </div>
  `;
}

function renderShell(state: ViewState): string {
  const plan: DayMealPlan = getDayMealPlan(state.selectedDay);
  const checks = checksFor(state, state.selectedDay);
  const featured = featuredCategory(state, checks);
  const isToday = isSameDay(state.selectedDay, state.today);
  const remaining = DAY_ORDER.filter(category => category !== featured)
    .map(category =>
      renderMealRow(category, plan.meals[category], checks[category])
    )
    .join('');

  return `
    <div class="food-view">
      <header class="food-day">
        <button type="button" class="food-day__nav" data-day-shift="-1" aria-label="Previous day">‹</button>
        <div class="food-day__identity">
          <span>${escapeHtml(formatDay(state.selectedDay))}</span>
          <small>${plan.vegetarian ? 'Vegetarian day' : 'Regular day'}</small>
        </div>
        <button type="button" class="food-day__nav" data-day-shift="1" aria-label="Next day">›</button>
      </header>

      ${isToday ? '' : '<button type="button" class="food-day__today" data-today>Back to today</button>'}

      <aside class="food-rule" aria-label="Food rule">
        <span>Dress the carb</span>
        <p>Add protein, fat, or fibre.</p>
      </aside>

      ${renderFeaturedMeal(featured, plan.meals[featured], checks[featured])}

      <details class="food-rest">
        <summary>Rest of the day</summary>
        <div class="food-rest__list">${remaining}</div>
      </details>
    </div>
  `;
}

const STATE = new WeakMap<HTMLElement, ViewState>();
const LISTENER_ATTR = 'data-food-view-attached';

function attachListener(container: HTMLElement): void {
  if (container.getAttribute(LISTENER_ATTR) === 'true') return;
  container.setAttribute(LISTENER_ATTR, 'true');

  const paint = (): void => {
    const state = STATE.get(container);
    if (state) container.innerHTML = renderShell(state);
  };

  container.addEventListener('click', event => {
    const state = STATE.get(container);
    const target = event.target as HTMLElement | null;
    if (!state || !target) return;

    const shift = target.closest<HTMLButtonElement>('[data-day-shift]');
    if (shift) {
      const amount = Number(shift.dataset.dayShift);
      state.selectedDay = new Date(
        state.selectedDay.getFullYear(),
        state.selectedDay.getMonth(),
        state.selectedDay.getDate() + amount
      );
      paint();
      return;
    }

    if (target.closest<HTMLButtonElement>('[data-today]')) {
      state.selectedDay = new Date(state.today);
      paint();
      return;
    }

    const check = target.closest<HTMLButtonElement>('[data-meal]');
    const category = check?.dataset.meal as MealCategory | undefined;
    if (category && MEAL_CATEGORIES.includes(category)) {
      const checks = checksFor(state, state.selectedDay);
      checks[category] = !checks[category];
      paint();
    }
  });
}

export function renderFoodView(container: HTMLElement, today: Date): void {
  STATE.set(container, {
    selectedDay: new Date(today),
    today: new Date(today),
    checksByDate: new Map(),
  });
  attachListener(container);
  container.innerHTML = renderShell(STATE.get(container)!);
}
