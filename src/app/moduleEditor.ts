/**
 * Edit + Add module UX.
 *
 * Self-contained — does not depend on moduleReorder being wired. Owns its
 * own edit-mode state machine so the user can rename/re-emoji/delete and
 * add tiles without the (currently disabled) drag-to-reorder feature.
 *
 * Composition:
 *   • An "Edit" pill toggles `body.module-edit-mode`. While set, every
 *     tile shows a small pencil; tile clicks are intercepted to keep the
 *     user from accidentally navigating off-page.
 *   • Pencil → small dialog to rename / re-emoji the tapped tile. Custom
 *     tiles also get a Delete action.
 *   • "+ Add module" pill → name / category / emoji dialog. On save the
 *     new tile is injected into the matching container without a reload.
 *   • A floating "Done" pill (mirroring the design of the disabled
 *     reorder Done) appears in edit mode for explicit exit; Escape works
 *     too. Clicking outside any tile / pencil / dialog also exits.
 */
import {
  addCustomModule,
  archiveModule,
  deleteCustomModule,
  isCustomId,
  updateCustomModule,
  saveOverride,
  type CustomModule,
} from '../domains/modules/customModules';
import { renderArchivedSection } from './customModules';

const EDIT_BADGE_CLASS = 'module-edit-badge';
const ADD_BUTTON_ID = 'module-add-btn';
const EDIT_TOGGLE_ID = 'module-edit-toggle';
const DONE_BUTTON_ID = 'reorder-done-btn'; // Reuses existing CSS pill.

const TILE_SELECTOR = '.nav-carousel .nav-item, .category-grid .module-card';
// Click targets that must NOT exit edit mode or trigger tile navigation.
const EDITOR_CHROME_SELECTOR =
  '.module-edit-badge, #' + EDIT_TOGGLE_ID + ', #' + ADD_BUTTON_ID +
  ', #' + DONE_BUTTON_ID + ', .module-edit-dialog';

interface TileMeta {
  id: string;
  isCustom: boolean;
  currentName: string;
  currentEmoji: string | null;
  category: 'journey' | 'learn';
}

function readTileMeta(tile: HTMLElement): TileMeta | null {
  const id = tile.dataset.module;
  if (!id) return null;
  const heading = tile.querySelector('h2, h3');
  const currentName = heading?.textContent?.trim() ?? '';
  const emojiSpan = tile.querySelector<HTMLElement>('.module-emoji');
  const currentEmoji = emojiSpan?.textContent?.trim() ?? null;
  const category: 'journey' | 'learn' = tile.classList.contains('nav-item')
    ? 'journey'
    : 'learn';
  return {
    id,
    isCustom: isCustomId(id),
    currentName,
    currentEmoji,
    category,
  };
}

/* ─────────────────────────────────────────────────────────────────
 * Edit badge — the small pencil that appears on every tile in edit
 * mode. Inserted lazily via `decorateTilesForEdit()` after the editor
 * is initialized; CSS handles show/hide via `body.module-edit-mode`.
 * ───────────────────────────────────────────────────────────────── */

function ensureEditBadge(tile: HTMLElement): void {
  if (tile.querySelector(`.${EDIT_BADGE_CLASS}`)) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = EDIT_BADGE_CLASS;
  btn.setAttribute('aria-label', 'Edit module');
  btn.tabIndex = -1; // Only meaningful in edit mode; keep it out of normal tab order.
  btn.innerHTML = '<span aria-hidden="true">✎</span>';
  // Stop the press-to-drag timer from arming when the user taps the badge.
  btn.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const meta = readTileMeta(tile);
    if (meta) openEditDialog(meta);
  });
  tile.appendChild(btn);
}

function decorateTilesForEdit(): void {
  document.querySelectorAll<HTMLElement>(TILE_SELECTOR).forEach(tile => {
    if (tile.hidden) return;
    ensureEditBadge(tile);
  });
}

/* ─────────────────────────────────────────────────────────────────
 * Edit dialog — rename / re-emoji / delete (custom only).
 * ───────────────────────────────────────────────────────────────── */

function openEditDialog(meta: TileMeta): void {
  const dialog = buildDialog({
    title: meta.isCustom ? 'Edit module' : `Edit · ${meta.currentName}`,
    fields: [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        value: meta.currentName,
        required: true,
        maxLength: 32,
      },
      {
        key: 'emoji',
        label: meta.isCustom ? 'Emoji' : 'Emoji (optional)',
        type: 'emoji',
        value: meta.currentEmoji ?? '',
        required: meta.isCustom,
      },
    ],
    primaryLabel: 'Save',
    secondaryAction: {
      label: 'Archive',
      onAction: () => handleArchive(meta),
    },
    extraAction: meta.isCustom
      ? { label: 'Delete', dangerous: true, onAction: () => handleDelete(meta) }
      : null,
    onSubmit: values => handleEditSave(meta, values),
  });
  document.body.appendChild(dialog);
  // Focus the name input on next frame so layout has settled.
  requestAnimationFrame(() => {
    dialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  });
}

function handleArchive(meta: TileMeta): void {
  archiveModule(meta.id, meta.category);
  // Hide the live tile immediately; the Archived section renderer
  // picks the entry up on the next call.
  const tile = document.querySelector<HTMLElement>(
    `[data-module="${CSS.escape(meta.id)}"]`
  );
  if (tile) {
    if (meta.isCustom) {
      // Custom tiles are injected at render time; remove rather than
      // hide so re-rendering can rebuild them without duplicating.
      tile.remove();
    } else {
      tile.hidden = true;
      tile.dataset.archivedHidden = 'true';
    }
  }
  renderArchivedSection();
  closeOpenDialog();
}

function handleEditSave(meta: TileMeta, values: Record<string, string>): boolean {
  const name = values.name.trim();
  const emoji = values.emoji.trim();
  if (!name) return false;
  if (meta.isCustom && !emoji) return false;

  if (meta.isCustom) {
    // Update in both localStorage cache and Supabase.
    updateCustomModule(meta.id, { name, emoji });
  } else {
    saveOverride(meta.id, {
      displayName: name === meta.currentName ? undefined : name,
      emoji: emoji,
    });
  }

  applyTileChanges(meta.id, name, emoji);
  return true;
}

function handleDelete(meta: TileMeta): void {
  if (!meta.isCustom) return;
  const ok = window.confirm(
    `Delete "${meta.currentName}"? This removes the module and its page link.`
  );
  if (!ok) return;
  deleteCustomModule(meta.id);
  document.querySelector(`[data-module="${CSS.escape(meta.id)}"]`)?.remove();
  closeOpenDialog();
}

function applyTileChanges(id: string, name: string, emoji: string): void {
  const tile = document.querySelector<HTMLElement>(
    `[data-module="${CSS.escape(id)}"]`
  );
  if (!tile) return;

  const heading = tile.querySelector('h2, h3');
  if (heading) heading.textContent = name;
  tile.title = name;
  if (tile.hasAttribute('aria-label')) {
    const verb = tile.classList.contains('nav-item') ? 'Navigate to' : 'Open';
    tile.setAttribute('aria-label', `${verb} ${name}`);
  }

  if (emoji) {
    const iconHost = tile.querySelector<HTMLElement>('.nav-icon, .module-icon');
    if (iconHost) {
      const safe = emoji.replace(/</g, '&lt;');
      iconHost.innerHTML = `<span class="module-emoji" aria-hidden="true">${safe}</span>`;
    }
  }
}

/* ─────────────────────────────────────────────────────────────────
 * Add Module — pill button + dialog.
 * ───────────────────────────────────────────────────────────────── */

function ensureAddButton(): void {
  if (document.getElementById(ADD_BUTTON_ID)) return;
  const learnGrid = document.querySelector<HTMLElement>('.category-grid');
  if (!learnGrid) return;

  const row = document.createElement('div');
  row.className = 'module-action-row';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.id = EDIT_TOGGLE_ID;
  editBtn.className = 'module-add-btn module-add-btn--ghost';
  editBtn.setAttribute('aria-label', 'Edit modules');
  editBtn.innerHTML = '<span aria-hidden="true">✎</span> Edit';
  editBtn.addEventListener('click', e => {
    e.preventDefault();
    toggleEditMode();
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.id = ADD_BUTTON_ID;
  addBtn.className = 'module-add-btn';
  addBtn.setAttribute('aria-label', 'Add a new module');
  addBtn.innerHTML = '<span aria-hidden="true">+</span> Add module';
  addBtn.addEventListener('click', e => {
    e.preventDefault();
    openAddDialog();
  });

  row.appendChild(editBtn);
  row.appendChild(addBtn);
  learnGrid.parentElement?.appendChild(row);
}

/* ─────────────────────────────────────────────────────────────────
 * Edit-mode state machine.
 * ─────────────────────────────────────────────────────────────── */

let editMode = false;
let doneButton: HTMLButtonElement | null = null;

function ensureDoneButton(): HTMLButtonElement {
  if (doneButton) return doneButton;
  // If reorder.ts is ever re-enabled it will create the same id; reuse
  // whichever exists rather than producing a duplicate.
  const existing = document.getElementById(
    DONE_BUTTON_ID
  ) as HTMLButtonElement | null;
  if (existing) {
    doneButton = existing;
    return existing;
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = DONE_BUTTON_ID;
  btn.className = 'reorder-done-btn';
  btn.textContent = 'Done';
  btn.setAttribute('aria-label', 'Finish editing');
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    exitEditMode();
  });
  document.body.appendChild(btn);
  doneButton = btn;
  return btn;
}

function enterEditMode(): void {
  if (editMode) return;
  // Cancel any in-flight single-click replay so we don't navigate
  // ~280ms after entering edit mode.
  clearPendingClick();
  editMode = true;
  document.body.classList.add('module-edit-mode');
  ensureDoneButton().classList.add('is-visible');
  decorateTilesForEdit();
}

function exitEditMode(): void {
  if (!editMode) return;
  editMode = false;
  document.body.classList.remove('module-edit-mode');
  doneButton?.classList.remove('is-visible');
}

function toggleEditMode(): void {
  if (editMode) exitEditMode();
  else enterEditMode();
}

/* ─────────────────────────────────────────────────────────────────
 * Double-click → edit mode.
 *
 * Anchor tiles (`<a href>`) navigate on the first synchronous click,
 * which means a native `dblclick` listener never fires — the page is
 * already leaving. We synthesize a double-click by intercepting every
 * tile click at capture phase: hold the first one for a short window
 * and either fire the original action (single click) or enter edit
 * mode (second click on the same tile).
 *
 * The cost: a ~DOUBLE_CLICK_MS delay on single clicks of tiles. Other
 * elements (Edit pill, Add button, header refresh, …) are untouched.
 *
 * On iOS, `touch-action: manipulation` on the tiles (set in CSS)
 * disables the double-tap-to-zoom delay so two quick taps both fire
 * `click` events and our timer sees them.
 * ───────────────────────────────────────────────────────────────── */

const DOUBLE_CLICK_MS = 280;
const SYNTHETIC_FLAG = '__kingTileSynthetic';

interface PendingClick {
  tile: HTMLElement;
  timer: number;
}

let pendingClick: PendingClick | null = null;

function clearPendingClick(): void {
  if (!pendingClick) return;
  window.clearTimeout(pendingClick.timer);
  pendingClick = null;
}

/**
 * Replay the tile's natural action after the double-click window
 * expired without a second click. For anchors that's a navigation; for
 * Learn buttons it's the delegated click handler in modalManager.ts —
 * we re-dispatch a click marked as synthetic so this interceptor lets
 * it through.
 */
function performTileAction(tile: HTMLElement): void {
  if (tile instanceof HTMLAnchorElement && tile.href) {
    if (tile.target === '_blank') window.open(tile.href, '_blank');
    else window.location.href = tile.href;
    return;
  }
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
  (ev as unknown as Record<string, unknown>)[SYNTHETIC_FLAG] = true;
  tile.dispatchEvent(ev);
}

function onDocumentClickCapture(e: MouseEvent): void {
  // Let our own re-dispatched click reach the delegated handlers.
  if ((e as unknown as Record<string, unknown>)[SYNTHETIC_FLAG]) return;

  const target = e.target as HTMLElement | null;
  if (!target) return;

  // Editor chrome (pencil badge, Edit/Add pills, Done button, dialog)
  // handles its own clicks regardless of edit-mode state. Cancel any
  // pending tile-action replay so it doesn't fire after the user
  // tapped a chrome control.
  if (target.closest(EDITOR_CHROME_SELECTOR)) {
    clearPendingClick();
    return;
  }

  if (editMode) {
    const tile = target.closest<HTMLElement>('.nav-item, .module-card');
    if (tile) {
      // Don't navigate or open modals while editing.
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Tap somewhere else on the page → exit edit mode.
    exitEditMode();
    return;
  }

  // Not editing: a tile click might be the start of a double-click.
  const tile = target.closest<HTMLElement>('.nav-item, .module-card');
  if (!tile) {
    // Click on empty page / non-tile UI — cancel any pending replay
    // so it doesn't fire 200ms later in the user's face.
    clearPendingClick();
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  if (pendingClick && pendingClick.tile === tile) {
    // Second click on the same tile within the window — enter edit mode.
    clearPendingClick();
    enterEditMode();
    return;
  }

  // First click — start the timer. If a second click doesn't arrive
  // in time, replay the original tile action.
  clearPendingClick();
  const capturedTile = tile;
  const timer = window.setTimeout(() => {
    pendingClick = null;
    performTileAction(capturedTile);
  }, DOUBLE_CLICK_MS);
  pendingClick = { tile: capturedTile, timer };
}

function onDocumentKeyDown(e: KeyboardEvent): void {
  if (editMode && e.key === 'Escape') {
    e.preventDefault();
    exitEditMode();
  }
}

function openAddDialog(): void {
  const dialog = buildDialog({
    title: 'Add module',
    fields: [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        value: '',
        placeholder: 'e.g. Garden',
        required: true,
        maxLength: 32,
      },
      {
        key: 'category',
        label: 'Type',
        type: 'choice',
        value: 'learn',
        choices: [
          { value: 'journey', label: 'Journey · top carousel' },
          { value: 'learn', label: 'Learn · grid' },
        ],
        required: true,
      },
      {
        key: 'emoji',
        label: 'Emoji',
        type: 'emoji',
        value: '🌱',
        required: true,
      },
    ],
    primaryLabel: 'Create',
    extraAction: null,
    onSubmit: values => handleAddSubmit(values),
  });
  document.body.appendChild(dialog);
  requestAnimationFrame(() => {
    dialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  });
}

function handleAddSubmit(values: Record<string, string>): boolean {
  const name = values.name.trim();
  const emoji = values.emoji.trim();
  const category = values.category === 'journey' ? 'journey' : 'learn';
  if (!name || !emoji) return false;

  const created = addCustomModule({ name, emoji, category });
  injectNewTile(created);
  return true;
}

function injectNewTile(module: CustomModule): void {
  // Cheaper than re-running the full render — append directly here. The
  // rendering logic mirrors customModules.ts so adopting a future visual
  // change in either place needs both.
  const safe = module.emoji.replace(/</g, '&lt;');

  if (module.category === 'journey') {
    const container = document.querySelector<HTMLElement>('.nav-carousel');
    if (!container) return;
    const a = document.createElement('a');
    a.href = `custom.html?id=${encodeURIComponent(module.id)}`;
    a.className = 'nav-item';
    a.setAttribute('role', 'listitem');
    a.dataset.module = module.id;
    a.dataset.custom = 'true';
    a.setAttribute('aria-label', `Navigate to ${module.name} page`);
    a.title = module.name;
    a.innerHTML = `
      <div class="nav-icon"><span class="module-emoji" aria-hidden="true">${safe}</span></div>
      <h2></h2>
    `;
    a.querySelector('h2')!.textContent = module.name;
    container.appendChild(a);
    if (document.body.classList.contains('module-edit-mode')) ensureEditBadge(a);
  } else {
    const container = document.querySelector<HTMLElement>('.category-grid');
    if (!container) return;
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
    btn.innerHTML = `
      <div class="module-icon"><span class="module-emoji" aria-hidden="true">${safe}</span></div>
      <h3 class="font-bold text-sm sm:text-xs"></h3>
    `;
    btn.querySelector('h3')!.textContent = module.name;
    container.appendChild(btn);
    if (document.body.classList.contains('module-edit-mode')) ensureEditBadge(btn);
  }
}

/* ─────────────────────────────────────────────────────────────────
 * Tiny shared dialog primitive. Vintage-typewriter styled via
 * `.module-edit-dialog` selectors in components.css.
 * ───────────────────────────────────────────────────────────────── */

interface DialogField {
  key: string;
  label: string;
  type: 'text' | 'emoji' | 'choice';
  value: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  choices?: Array<{ value: string; label: string }>;
}

interface DialogConfig {
  title: string;
  fields: DialogField[];
  primaryLabel: string;
  /**
   * Left-aligned destructive action (e.g. Delete). Only shown when set.
   * Dialog stays open after invoking — the handler is responsible for
   * closing it (so confirm-cancel can leave the dialog up).
   */
  extraAction: { label: string; dangerous: boolean; onAction: () => void } | null;
  /**
   * Left-aligned non-destructive action (e.g. Archive). Sits between
   * the danger button and the form controls. Closes the dialog after
   * invoking so the page re-renders cleanly.
   */
  secondaryAction?: { label: string; onAction: () => void } | null;
  onSubmit: (values: Record<string, string>) => boolean;
}

let openDialog: HTMLDivElement | null = null;

function closeOpenDialog(): void {
  openDialog?.remove();
  openDialog = null;
  document.removeEventListener('keydown', onDialogKeydown);
}

function onDialogKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeOpenDialog();
  }
}

function buildDialog(config: DialogConfig): HTMLDivElement {
  closeOpenDialog();
  const overlay = document.createElement('div');
  overlay.className = 'module-edit-dialog';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', config.title);

  const panel = document.createElement('div');
  panel.className = 'module-edit-dialog__panel';

  const heading = document.createElement('h3');
  heading.className = 'module-edit-dialog__title';
  heading.textContent = config.title;
  panel.appendChild(heading);

  const form = document.createElement('form');
  form.className = 'module-edit-dialog__form';
  form.noValidate = true;

  const fieldEls: Record<string, HTMLInputElement | HTMLSelectElement> = {};

  config.fields.forEach(field => {
    const row = document.createElement('label');
    row.className = 'module-edit-dialog__row';
    const labelText = document.createElement('span');
    labelText.className = 'module-edit-dialog__label';
    labelText.textContent = field.label;
    row.appendChild(labelText);

    if (field.type === 'choice') {
      const select = document.createElement('select');
      select.name = field.key;
      select.className = 'module-edit-dialog__select';
      (field.choices ?? []).forEach(choice => {
        const opt = document.createElement('option');
        opt.value = choice.value;
        opt.textContent = choice.label;
        if (choice.value === field.value) opt.selected = true;
        select.appendChild(opt);
      });
      fieldEls[field.key] = select;
      row.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = field.key;
      input.value = field.value;
      input.className =
        field.type === 'emoji'
          ? 'module-edit-dialog__input module-edit-dialog__input--emoji'
          : 'module-edit-dialog__input';
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.maxLength) input.maxLength = field.maxLength;
      if (field.type === 'emoji') {
        input.maxLength = 4;
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.inputMode = 'text';
      }
      fieldEls[field.key] = input;
      row.appendChild(input);
    }

    form.appendChild(row);
  });

  const actions = document.createElement('div');
  actions.className = 'module-edit-dialog__actions';

  if (config.extraAction) {
    const extra = document.createElement('button');
    extra.type = 'button';
    extra.className = config.extraAction.dangerous
      ? 'module-edit-dialog__btn module-edit-dialog__btn--danger'
      : 'module-edit-dialog__btn';
    extra.textContent = config.extraAction.label;
    extra.addEventListener('click', () => config.extraAction!.onAction());
    actions.appendChild(extra);
  }

  if (config.secondaryAction) {
    const sec = document.createElement('button');
    sec.type = 'button';
    sec.className = 'module-edit-dialog__btn module-edit-dialog__btn--secondary';
    sec.textContent = config.secondaryAction.label;
    sec.addEventListener('click', () => config.secondaryAction!.onAction());
    actions.appendChild(sec);
  }

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'module-edit-dialog__btn module-edit-dialog__btn--ghost';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => closeOpenDialog());
  actions.appendChild(cancel);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'module-edit-dialog__btn module-edit-dialog__btn--primary';
  submit.textContent = config.primaryLabel;
  actions.appendChild(submit);

  form.appendChild(actions);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const values: Record<string, string> = {};
    Object.entries(fieldEls).forEach(([key, el]) => {
      values[key] = el.value;
    });
    const ok = config.onSubmit(values);
    if (ok) closeOpenDialog();
  });

  panel.appendChild(form);
  overlay.appendChild(panel);

  // Click on the overlay (outside the panel) closes the dialog.
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeOpenDialog();
  });

  document.addEventListener('keydown', onDialogKeydown);
  openDialog = overlay;
  return overlay;
}

/* ─────────────────────────────────────────────────────────────────
 * Public init.
 * ───────────────────────────────────────────────────────────────── */

export function initializeModuleEditor(): void {
  ensureAddButton();
  // Decorate immediately so the badges are available the moment edit
  // mode is entered. CSS keeps them invisible until body.module-edit-mode.
  decorateTilesForEdit();

  // Re-decorate whenever new tiles arrive (e.g. after creating one).
  // We don't get a notification, so use a MutationObserver on the two
  // host containers.
  const observerTargets = ['.nav-carousel', '.category-grid']
    .map(sel => document.querySelector<HTMLElement>(sel))
    .filter((el): el is HTMLElement => !!el);
  observerTargets.forEach(host => {
    const mo = new MutationObserver(() => decorateTilesForEdit());
    mo.observe(host, { childList: true });
  });

  document.addEventListener('click', onDocumentClickCapture, { capture: true });
  document.addEventListener('keydown', onDocumentKeyDown);
}
