/** Food — two universal actions, a tap-to-build meal, and one meal idea. */

import { createSafeHtml } from '../../utils/escapeHtml';
import {
  FOOD_SHELF,
  type GlycemicIndexReference,
  type MealCategory,
  getDayMealPlan,
} from './data';

/** The meal window is deliberately broad; this is a cue, not a schedule. */
export function mealCategoryForHour(hour: number): MealCategory {
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

export function toggleMealChoice(
  current: ReadonlyArray<string | undefined>,
  categoryIndex: number,
  food: string
): Array<string | undefined> {
  const next = [...current];
  next[categoryIndex] = current[categoryIndex] === food ? undefined : food;
  return next;
}

export function formatGlycemicIndex(
  gi: GlycemicIndexReference | null
): string {
  if (!gi) return '';
  return gi.high === undefined ? String(gi.low) : `${gi.low}–${gi.high}`;
}

export function renderFoodView(container: HTMLElement, today: Date): void {
  const category = mealCategoryForHour(today.getHours());
  const meal = getDayMealPlan(today).meals[category];
  const components = [
    meal.components.protein,
    meal.components.fibre,
    meal.components.carb,
  ].filter((item): item is string => Boolean(item));
  const shelf = FOOD_SHELF.map(
    (category, categoryIndex) => `
      <section class="food-shelf__group">
        <h3>${createSafeHtml(category.label)}</h3>
        <div class="food-shelf__choices">
          ${category.foods
            .map(
              (food, foodIndex) => `
                <button
                  class="food-shelf__choice"
                  type="button"
                  aria-pressed="false"
                  data-category-index="${categoryIndex}"
                  data-food-index="${foodIndex}"
                >
                  <span class="food-shelf__choice-name">${createSafeHtml(food.name)}</span>
                  ${food.gi ? `<span class="food-shelf__choice-gi">GI ${formatGlycemicIndex(food.gi)}</span>` : ''}
                </button>
              `
            )
            .join('')}
        </div>
      </section>
    `
  ).join('');

  container.innerHTML = `
    <section class="food-view" aria-label="Food pointers">
      <div class="food-actions" role="list">
        <div class="food-action" role="listitem">
          <span class="food-action__glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M12 4v8l6 3"></path>
              <path d="m12 12-5 5"></path>
            </svg>
          </span>
          <span class="food-action__copy">
            <strong>Dress the carb</strong>
            <small>Protein · fat · fibre</small>
          </span>
        </div>
        <div class="food-action" role="listitem">
          <span class="food-action__glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5" cy="6" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
              <circle cx="5" cy="18" r="1"></circle>
              <path d="M9 6h10"></path>
              <path d="M9 12h10"></path>
              <path d="M9 18h10"></path>
            </svg>
          </span>
          <span class="food-action__copy">
            <strong>Eat in order</strong>
            <small>Protein · veg · carb</small>
          </span>
        </div>
      </div>

      <details class="food-disclosure food-shelf">
        <summary>Build a meal <span aria-hidden="true">›</span></summary>
        <div class="food-builder__meal" aria-live="polite" hidden>
          <span>Your meal</span>
          <p></p>
        </div>
        <div class="food-shelf__groups">
          ${shelf}
        </div>
      </details>

      <details class="food-disclosure food-idea">
        <summary>Meal idea <span aria-hidden="true">›</span></summary>
        <div class="food-idea__meal">
          <p class="food-meal__components">${components.map(item => createSafeHtml(item)).join(' · ')}</p>
        </div>
      </details>
    </section>
  `;

  const shelfElement = container.querySelector<HTMLElement>('.food-shelf');
  const mealElement = container.querySelector<HTMLElement>(
    '.food-builder__meal'
  );
  const mealText = mealElement?.querySelector<HTMLParagraphElement>('p');
  if (!shelfElement || !mealElement || !mealText) return;

  let selection: Array<string | undefined> = [];

  shelfElement.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('.food-shelf__choice');
    if (!button || !shelfElement.contains(button)) return;

    const categoryIndex = Number(button.dataset.categoryIndex);
    const foodIndex = Number(button.dataset.foodIndex);
    const food = FOOD_SHELF[categoryIndex]?.foods[foodIndex];
    if (!food) return;

    selection = toggleMealChoice(selection, categoryIndex, food.name);
    const selectedFoods = selection.filter(
      (item): item is string => Boolean(item)
    );

    shelfElement
      .querySelectorAll<HTMLButtonElement>('.food-shelf__choice')
      .forEach(choice => {
        const choiceCategory = Number(choice.dataset.categoryIndex);
        const choiceFood = Number(choice.dataset.foodIndex);
        const isSelected =
          FOOD_SHELF[choiceCategory]?.foods[choiceFood]?.name ===
          selection[choiceCategory];
        choice.setAttribute('aria-pressed', String(isSelected));
      });

    mealText.textContent = selectedFoods.join(' · ');
    mealElement.hidden = selectedFoods.length === 0;
  });
}
