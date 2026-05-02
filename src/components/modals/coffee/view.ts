/**
 * Coffee modal view — featured "today's coffee" hero card on top, then
 * the full menu organised by category. Each menu entry is a tappable
 * card with the drink's SVG illustration on the left, name and meta in
 * the middle, and a "+" indicator on the right that flips to "×" when
 * the card is expanded.
 *
 * Expand/collapse is JS-driven (single click handler delegated on the
 * container) so the card visual stays intact instead of relying on the
 * native <details>/<summary> reveal.
 */

import { createSafeHtml, escapeHtml } from '../../../utils/escapeHtml';
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  type Recipe,
  getMenuByCategory,
  getTodaysDrink,
} from './data';
import { getCoffeeIcon } from './icons';

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
  // SVG strings are author-controlled (this module). Architecture guard
  // checks for AI-derived innerHTML, not for static literals.
  const icon = getCoffeeIcon(recipe.name);
  return `
    <article class="coffee-card">
      <div class="coffee-card__icon">${icon}</div>
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

function renderMenuItem(recipe: Recipe, index: number): string {
  const icon = getCoffeeIcon(recipe.name);
  return `
    <li class="coffee-menu__item" data-recipe-index="${index}">
      <button
        type="button"
        class="coffee-menu__card"
        aria-expanded="false"
        aria-controls="coffee-menu-detail-${index}"
        data-action="toggle"
      >
        <span class="coffee-menu__icon">${icon}</span>
        <span class="coffee-menu__card-text">
          <span class="coffee-menu__name">${createSafeHtml(recipe.name)}</span>
          <span class="coffee-menu__sub">${escapeHtml(CATEGORY_LABELS[recipe.category])} · ${escapeHtml(DIFFICULTY_LABELS[recipe.difficulty])} · ${escapeHtml(recipe.brewTime)}</span>
        </span>
        <span class="coffee-menu__chevron" aria-hidden="true">+</span>
      </button>
      <div
        id="coffee-menu-detail-${index}"
        class="coffee-menu__expanded"
        hidden
      >
        <p class="coffee-recipe__origin">${createSafeHtml(recipe.origin)}</p>
        ${renderIngredients(recipe)}
        ${renderMethod(recipe)}
        ${renderTip(recipe)}
      </div>
    </li>
  `;
}

function renderMenu(): string {
  const groups = getMenuByCategory();
  let counter = 0;
  const sections = groups
    .map(({ category, recipes }) => {
      const items = recipes.map(r => renderMenuItem(r, counter++)).join('');
      return `
        <section class="coffee-menu__group">
          <h4 class="coffee-menu__group-heading">${escapeHtml(CATEGORY_LABELS[category])}</h4>
          <ul class="coffee-menu__list">${items}</ul>
        </section>
      `;
    })
    .join('');
  return `
    <section class="coffee-menu" aria-label="Full coffee menu">
      <h3 class="coffee-section-heading">Full menu</h3>
      ${sections}
    </section>
  `;
}

function attachMenuToggles(container: HTMLElement): void {
  container.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const trigger = target?.closest<HTMLButtonElement>(
      '.coffee-menu__card[data-action="toggle"]'
    );
    if (!trigger) return;
    const item = trigger.closest<HTMLLIElement>('.coffee-menu__item');
    const panel = item?.querySelector<HTMLElement>('.coffee-menu__expanded');
    if (!item || !panel) return;
    const open = item.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
  });
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
  attachMenuToggles(container);
}
