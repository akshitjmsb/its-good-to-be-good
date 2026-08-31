/** Food — two universal actions, with one optional meal idea. */

import { createSafeHtml } from '../../utils/escapeHtml';
import { FOOD_SHELF, type MealCategory, getDayMealPlan } from './data';

/** The meal window is deliberately broad; this is a cue, not a schedule. */
export function mealCategoryForHour(hour: number): MealCategory {
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
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
    category => `
      <section class="food-shelf__group">
        <h3>${createSafeHtml(category.label)}</h3>
        <p>${category.foods.map(food => createSafeHtml(food)).join(' · ')}</p>
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
}
