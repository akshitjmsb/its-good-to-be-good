/**
 * Coffee modal view — today's featured drink + the full cafe menu.
 *
 *   ┌────────────────────────────────────┐
 *   │ TODAY'S COFFEE                     │
 *   │ ┌────────────────────────────────┐ │
 *   │ │ Cappuccino                     │ │
 *   │ │ Milk-based · Medium · 3 min    │ │
 *   │ │ Named for the Capuchin friars… │ │
 *   │ │ INGREDIENTS                    │ │
 *   │ │ Double espresso     36 g       │ │
 *   │ │ Whole milk, steamed 120 ml     │ │
 *   │ │ METHOD                         │ │
 *   │ │ 1. Pull a double espresso…     │ │
 *   │ │ ─────                          │ │
 *   │ │ TIP                            │ │
 *   │ │ Italians never order one…      │ │
 *   │ └────────────────────────────────┘ │
 *   │                                    │
 *   │ FULL MENU                          │
 *   │ Espresso ──────────────────        │
 *   │ ▸ Espresso        medium · 30 sec  │
 *   │ ▸ Doppio          easy · 30 sec    │
 *   │ …                                  │
 *   └────────────────────────────────────┘
 *
 * No JS state — menu rows use native <details>/<summary> for expand/
 * collapse with proper a11y, single delegated handler not needed.
 */

import { createSafeHtml, escapeHtml } from '../../../utils/escapeHtml';
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  type Recipe,
  getMenuByCategory,
  getTodaysDrink,
} from './data';

function renderMeta(recipe: Recipe): string {
  return `
    <p class="coffee-recipe__meta">
      <span class="coffee-recipe__meta-item">${escapeHtml(CATEGORY_LABELS[recipe.category])}</span>
      <span class="coffee-recipe__meta-sep" aria-hidden="true">·</span>
      <span class="coffee-recipe__meta-item">${escapeHtml(DIFFICULTY_LABELS[recipe.difficulty])}</span>
      <span class="coffee-recipe__meta-sep" aria-hidden="true">·</span>
      <span class="coffee-recipe__meta-item">${escapeHtml(recipe.brewTime)}</span>
    </p>
  `;
}

function renderIngredients(recipe: Recipe): string {
  const rows = recipe.ingredients
    .map(
      ing => `
        <li class="coffee-recipe__ingredient">
          <span class="coffee-recipe__ingredient-name">${createSafeHtml(ing.item)}</span>
          <span class="coffee-recipe__ingredient-amount">${escapeHtml(ing.amount)}</span>
        </li>
      `
    )
    .join('');
  return `
    <section class="coffee-recipe__section">
      <h5 class="coffee-recipe__heading">Ingredients</h5>
      <ul class="coffee-recipe__ingredients">${rows}</ul>
    </section>
  `;
}

function renderMethod(recipe: Recipe): string {
  const steps = recipe.instructions
    .map(step => `<li class="coffee-recipe__step">${createSafeHtml(step)}</li>`)
    .join('');
  return `
    <section class="coffee-recipe__section">
      <h5 class="coffee-recipe__heading">Method</h5>
      <ol class="coffee-recipe__steps">${steps}</ol>
    </section>
  `;
}

function renderTip(recipe: Recipe): string {
  return `
    <section class="coffee-recipe__tip">
      <h5 class="coffee-recipe__heading">Tip</h5>
      <p class="coffee-recipe__tip-body">${createSafeHtml(recipe.tip)}</p>
    </section>
  `;
}

function renderTodayCard(recipe: Recipe): string {
  return `
    <article class="coffee-card">
      <header class="coffee-card__header">
        <h3 class="coffee-card__name">${createSafeHtml(recipe.name)}</h3>
        ${renderMeta(recipe)}
        <p class="coffee-recipe__origin">${createSafeHtml(recipe.origin)}</p>
      </header>
      ${renderIngredients(recipe)}
      ${renderMethod(recipe)}
      ${renderTip(recipe)}
    </article>
  `;
}

function renderMenuItem(recipe: Recipe): string {
  return `
    <details class="coffee-menu__item">
      <summary class="coffee-menu__summary">
        <span class="coffee-menu__summary-name">${createSafeHtml(recipe.name)}</span>
        <span class="coffee-menu__summary-meta">${escapeHtml(DIFFICULTY_LABELS[recipe.difficulty])} · ${escapeHtml(recipe.brewTime)}</span>
      </summary>
      <div class="coffee-menu__expanded">
        <p class="coffee-recipe__origin">${createSafeHtml(recipe.origin)}</p>
        ${renderIngredients(recipe)}
        ${renderMethod(recipe)}
        ${renderTip(recipe)}
      </div>
    </details>
  `;
}

function renderMenu(): string {
  const groups = getMenuByCategory();
  const sections = groups
    .map(
      ({ category, recipes }) => `
        <section class="coffee-menu__group">
          <h4 class="coffee-menu__group-heading">${escapeHtml(CATEGORY_LABELS[category])}</h4>
          <div class="coffee-menu__list">
            ${recipes.map(renderMenuItem).join('')}
          </div>
        </section>
      `
    )
    .join('');
  return `
    <section class="coffee-menu" aria-label="Full coffee menu">
      <h3 class="coffee-section-heading">Full menu</h3>
      ${sections}
    </section>
  `;
}

export function renderCoffeeView(container: HTMLElement, date: Date): void {
  const today = getTodaysDrink(date);
  container.innerHTML = `
    <div class="coffee-view">
      <section class="coffee-today" aria-labelledby="coffee-today-heading">
        <h3 id="coffee-today-heading" class="coffee-section-heading">Today's coffee</h3>
        ${renderTodayCard(today)}
      </section>
      ${renderMenu()}
    </div>
  `;
}
