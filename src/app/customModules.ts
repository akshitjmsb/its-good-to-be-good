/**
 * Render-side glue for user-created modules and built-in module overrides.
 *
 * Run after the static icons have been painted but before the saved-order
 * pass — see bootstrap.ts. The order matters:
 *   1. Static SVG icons render into their containers (existing code).
 *   2. We inject one DOM tile per CustomModule into the matching container.
 *   3. We apply ModuleOverrides — replacing the title text and/or
 *      swapping the icon contents for an emoji span where set.
 *   4. The reorder system reads localStorage order and shuffles all tiles
 *      (built-in + custom) into the saved sequence.
 *
 * Emojis are rendered as a `<span class="module-emoji">…</span>` placed
 * inside the existing `nav-icon` / `module-icon` containers, so the
 * surrounding sizing rules continue to apply.
 */
import {
  loadCustomModules,
  loadOverrides,
  type CustomModule,
} from '../domains/modules/customModules';

const JOURNEY_CONTAINER_SELECTOR = '.nav-carousel';
const LEARN_CONTAINER_SELECTOR = '.category-grid';

function emojiMarkup(emoji: string): string {
  // The container element already sets the bounding box; the emoji span
  // just needs to centre and size itself relative to that.
  const safe = emoji.replace(/</g, '&lt;');
  return `<span class="module-emoji" aria-hidden="true">${safe}</span>`;
}

function buildJourneyTile(module: CustomModule): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = `custom.html?id=${encodeURIComponent(module.id)}`;
  a.className = 'nav-item';
  a.setAttribute('role', 'listitem');
  a.dataset.module = module.id;
  a.dataset.custom = 'true';
  a.setAttribute('aria-label', `Navigate to ${module.name} page`);
  a.title = module.name;

  const icon = document.createElement('div');
  icon.className = 'nav-icon';
  icon.innerHTML = emojiMarkup(module.emoji);

  const heading = document.createElement('h2');
  heading.textContent = module.name;

  a.appendChild(icon);
  a.appendChild(heading);
  return a;
}

function buildLearnTile(module: CustomModule): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'preview-card module-card';
  btn.dataset.module = module.id;
  btn.dataset.custom = 'true';
  btn.setAttribute('aria-label', `Open ${module.name} module`);
  btn.title = module.name;
  btn.addEventListener('click', () => {
    window.location.href = `custom.html?id=${encodeURIComponent(module.id)}`;
  });

  const icon = document.createElement('div');
  icon.className = 'module-icon';
  icon.innerHTML = emojiMarkup(module.emoji);

  const heading = document.createElement('h3');
  heading.className = 'font-bold text-sm sm:text-xs';
  heading.textContent = module.name;

  btn.appendChild(icon);
  btn.appendChild(heading);
  return btn;
}

function injectCustomTiles(): void {
  const customs = loadCustomModules();
  if (customs.length === 0) return;

  const journeyContainer = document.querySelector<HTMLElement>(
    JOURNEY_CONTAINER_SELECTOR
  );
  const learnContainer = document.querySelector<HTMLElement>(
    LEARN_CONTAINER_SELECTOR
  );

  customs.forEach(module => {
    // Skip if already rendered (defensive — bootstrap should only fire once).
    const existing = document.querySelector(`[data-module="${module.id}"]`);
    if (existing) return;

    if (module.category === 'journey' && journeyContainer) {
      journeyContainer.appendChild(buildJourneyTile(module));
    } else if (module.category === 'learn' && learnContainer) {
      learnContainer.appendChild(buildLearnTile(module));
    }
  });
}

function applyOverridesToTile(tile: HTMLElement, displayName?: string, emoji?: string): void {
  if (displayName) {
    const heading = tile.querySelector('h2, h3');
    if (heading) heading.textContent = displayName;
    if (tile.hasAttribute('aria-label')) {
      const verb = tile.classList.contains('nav-item') ? 'Navigate to' : 'Open';
      tile.setAttribute('aria-label', `${verb} ${displayName}`);
    }
    tile.title = displayName;
  }

  if (emoji) {
    const iconHost = tile.querySelector<HTMLElement>('.nav-icon, .module-icon');
    if (iconHost) iconHost.innerHTML = emojiMarkup(emoji);
  }
}

function applyOverrides(): void {
  const overrides = loadOverrides();
  for (const [id, override] of Object.entries(overrides)) {
    const tile = document.querySelector<HTMLElement>(
      `[data-module="${CSS.escape(id)}"]`
    );
    if (!tile) continue;
    applyOverridesToTile(tile, override.displayName, override.emoji);
  }
}

export function initializeCustomModules(): void {
  injectCustomTiles();
  applyOverrides();
}
