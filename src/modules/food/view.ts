/** Food — the next meal and the two useful rules. */

import { createSafeHtml, escapeHtml } from '../../utils/escapeHtml';
import { type MealCategory, getDayMealPlan } from './data';

const CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

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
  const ingredients = meal.ingredients?.length
    ? `<p class="food-meal__ingredients">${meal.ingredients.map(item => createSafeHtml(item)).join(' · ')}</p>`
    : '';

  container.innerHTML = `
    <section class="food-view" aria-labelledby="food-meal-title">
      <p class="food-view__meal">${escapeHtml(CATEGORY_LABELS[category])}</p>
      <h3 class="food-view__name" id="food-meal-title">${createSafeHtml(meal.name)}</h3>
      ${ingredients}
      <div class="food-pointers">
        <p>Never eat a naked carb.</p>
        <p>Protein + veg first · carb last.</p>
      </div>
    </section>
  `;
}
