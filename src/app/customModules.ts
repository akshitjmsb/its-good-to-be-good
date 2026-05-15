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
  loadArchivedIds,
  isModuleArchived,
  unarchiveModule,
  type CustomModule,
} from '../domains/modules/customModules';
import { MODULE_REGISTRY } from '../domains/modules/registry';

const JOURNEY_CONTAINER_SELECTOR = '.nav-carousel';
const LEARN_CONTAINER_SELECTOR = '.category-grid';
const ARCHIVED_SECTION_ID = 'archived-section';

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
    // Archived customs are not rendered into the live grids; they show
    // up in the Archived section below.
    if (isModuleArchived(module.id)) return;

    if (module.category === 'journey' && journeyContainer) {
      journeyContainer.appendChild(buildJourneyTile(module));
    } else if (module.category === 'learn' && learnContainer) {
      learnContainer.appendChild(buildLearnTile(module));
    }
  });
}

/**
 * Mark built-in tiles currently in the DOM as `hidden` if archived,
 * and clear `hidden` if previously archived but now restored.
 *
 * Skips the Quantum slot — it ships `hidden` in the markup for an
 * unrelated reason (the header widget replaces it) and must stay that
 * way regardless of archive state.
 */
function applyArchivedHiddenState(): void {
  const archived = new Set(loadArchivedIds());

  document
    .querySelectorAll<HTMLElement>('[data-module]')
    .forEach(tile => {
      const id = tile.dataset.module;
      if (!id) return;
      // The Quantum nav slot is intentionally hidden via markup. Don't
      // touch tiles we didn't hide ourselves — they may have other reasons.
      if (id === 'quantum') return;

      const shouldHide = archived.has(id);
      const ours = tile.dataset.archivedHidden === 'true';

      if (shouldHide && !tile.hidden) {
        tile.hidden = true;
        tile.dataset.archivedHidden = 'true';
      } else if (!shouldHide && tile.hidden && ours) {
        tile.hidden = false;
        delete tile.dataset.archivedHidden;
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

interface ArchivedEntry {
  id: string;
  name: string;
  emoji: string;
  category: 'journey' | 'learn';
}

function resolveArchivedEntries(): ArchivedEntry[] {
  const ids = loadArchivedIds();
  if (ids.length === 0) return [];

  const overrides = loadOverrides();
  const customsById = new Map(loadCustomModules().map(m => [m.id, m]));

  return ids.flatMap((id): ArchivedEntry[] => {
    const custom = customsById.get(id);
    if (custom) {
      const o = overrides[id] ?? {};
      return [{
        id,
        name: o.displayName ?? custom.name,
        emoji: o.emoji ?? custom.emoji,
        category: custom.category,
      }];
    }
    const builtin = MODULE_REGISTRY.find(m => m.id === id);
    if (!builtin) return [];
    const o = overrides[id] ?? {};
    return [{
      id,
      name: o.displayName ?? builtin.displayName,
      emoji: o.emoji ?? '',
      category: builtin.category,
    }];
  });
}

function ensureArchivedSection(): HTMLElement | null {
  let section = document.getElementById(ARCHIVED_SECTION_ID);
  if (section) return section;
  const dayModule = document.getElementById('day-module');
  if (!dayModule) return null;

  section = document.createElement('section');
  section.id = ARCHIVED_SECTION_ID;
  section.className = 'mobile-section archived-section';
  section.hidden = true;
  section.innerHTML = `
    <h2 class="archived-section__title">Archived</h2>
    <p class="archived-section__hint">Tap to restore</p>
    <div class="archived-list" role="list"></div>
  `;
  dayModule.appendChild(section);
  return section;
}

function buildArchivedChip(entry: ArchivedEntry): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'archived-item';
  btn.dataset.archivedId = entry.id;
  btn.setAttribute('role', 'listitem');
  btn.setAttribute('aria-label', `Restore ${entry.name}`);
  btn.title = `Restore ${entry.name}`;

  const glyph = document.createElement('span');
  glyph.className = 'archived-item__glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = entry.emoji || '·';

  const label = document.createElement('span');
  label.className = 'archived-item__label';
  label.textContent = entry.name;

  const restore = document.createElement('span');
  restore.className = 'archived-item__restore';
  restore.setAttribute('aria-hidden', 'true');
  restore.textContent = '↩';

  btn.appendChild(glyph);
  btn.appendChild(label);
  btn.appendChild(restore);

  btn.addEventListener('click', e => {
    e.preventDefault();
    handleRestore(entry);
  });

  return btn;
}

function handleRestore(entry: ArchivedEntry): void {
  unarchiveModule(entry.id);
  // Re-render — bring the tile back into the live grid and refresh the
  // archived list. Cheaper than a full bootstrap pass.
  renderArchivedSection();

  // Built-in tile already exists in markup, just un-hide it.
  const builtinTile = document.querySelector<HTMLElement>(
    `[data-module="${CSS.escape(entry.id)}"]`
  );
  if (builtinTile && builtinTile.dataset.archivedHidden === 'true') {
    builtinTile.hidden = false;
    delete builtinTile.dataset.archivedHidden;
    return;
  }

  // Custom — inject the tile fresh.
  const custom = loadCustomModules().find(m => m.id === entry.id);
  if (!custom) return;
  if (custom.category === 'journey') {
    document
      .querySelector<HTMLElement>(JOURNEY_CONTAINER_SELECTOR)
      ?.appendChild(buildJourneyTile(custom));
  } else {
    document
      .querySelector<HTMLElement>(LEARN_CONTAINER_SELECTOR)
      ?.appendChild(buildLearnTile(custom));
  }
  applyOverrides();
}

export function renderArchivedSection(): void {
  const section = ensureArchivedSection();
  if (!section) return;
  const list = section.querySelector<HTMLElement>('.archived-list');
  if (!list) return;

  const entries = resolveArchivedEntries();
  list.replaceChildren();

  if (entries.length === 0) {
    section.hidden = true;
    return;
  }

  entries.forEach(entry => list.appendChild(buildArchivedChip(entry)));
  section.hidden = false;
}

export function initializeCustomModules(): void {
  injectCustomTiles();
  applyOverrides();
  applyArchivedHiddenState();
  renderArchivedSection();
}
