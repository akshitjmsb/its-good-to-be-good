/**
 * Apple-style edit-mode drag-to-reorder for the home-page modules.
 *
 * Two containers — the journey carousel (`.nav-carousel`) and the learn
 * grid (`.category-grid`) — each get an independent saved order keyed
 * by `data-module`.
 *
 * Interaction model (mirrors iOS home-screen reorder):
 *   1. Long-press (~500 ms) any tile to enter EDIT MODE. All tiles in
 *      both containers start jiggling, a "Done" pill appears under the
 *      header, and the long-pressed tile becomes the actively-dragged
 *      one in the same gesture.
 *   2. While in edit mode you can drag any tile to reorder. Pointer
 *      Events drive a fixed-position overlay clone; siblings reflow
 *      under it via DOM insertBefore.
 *   3. Exit by tapping "Done", tapping anywhere outside a tile, or
 *      pressing Escape. Order persists to localStorage.
 *
 * Long-press is cancelled if the pointer moves >MOVE_THRESHOLD_PX before
 * the timer fires — that's a scroll, not a drag. While in edit mode the
 * carousel still scrolls horizontally; drag only kicks in on a fresh
 * pointerdown directly on a tile.
 */

const STORAGE_PREFIX = 'module.order.';
const LONG_PRESS_MS = 500;
// Once already in edit mode the gesture to start a drag is shorter — a
// brief hold disambiguates "swipe to scroll the carousel" from "pick up
// this tile". Movement before this elapses cancels and lets the carousel
// scroll normally.
const EDIT_DRAG_HOLD_MS = 150;
const MOVE_THRESHOLD_PX = 8;

type ContainerKey = 'journey' | 'learn';

interface ContainerSpec {
  key: ContainerKey;
  containerSelector: string;
  itemSelector: string;
  keyAttr: string;
}

const SPECS: ReadonlyArray<ContainerSpec> = [
  {
    key: 'journey',
    containerSelector: '.nav-carousel',
    itemSelector: '.nav-item',
    keyAttr: 'data-module',
  },
  {
    key: 'learn',
    containerSelector: '.category-grid',
    itemSelector: '.module-card',
    keyAttr: 'data-module',
  },
];

interface WiredContainer {
  spec: ContainerSpec;
  container: HTMLElement;
}

let wiredContainers: WiredContainer[] = [];
let editMode = false;
let doneButton: HTMLButtonElement | null = null;

// Active-drag state. Captured at pointerdown on a tile while in edit
// mode (or at the moment the long-press timer fires for the entry
// gesture). Cleared on pointerup / pointercancel.
interface DragState {
  pointerId: number;
  item: HTMLElement;
  container: HTMLElement;
  spec: ContainerSpec;
  ghost: HTMLElement;
  offsetX: number;
  offsetY: number;
}

let drag: DragState | null = null;

// Tracks the long-press timer so we can cancel on early movement.
interface PressState {
  pointerId: number;
  item: HTMLElement;
  container: HTMLElement;
  spec: ContainerSpec;
  startX: number;
  startY: number;
  timer: number;
}

let press: PressState | null = null;

// One-shot click suppressor — set to the tile the user just released
// from a drag (or the long-press entry tap). The synthesised click
// would otherwise navigate or open a modal.
let suppressNextClickOn: HTMLElement | null = null;

function loadOrder(key: ContainerKey): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every((v: unknown) => typeof v === 'string')) return null;
    return parsed as string[];
  } catch {
    return null;
  }
}

function saveOrder(key: ContainerKey, order: string[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(order));
  } catch {
    // Private browsing / quota — silent fail; order applies for this session only.
  }
}

function readKey(item: HTMLElement, attr: string): string | null {
  return item.getAttribute(attr);
}

function readCurrentOrder(
  container: HTMLElement,
  itemSelector: string,
  keyAttr: string
): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
    .map(el => readKey(el, keyAttr))
    .filter((k): k is string => !!k);
}

/**
 * Reorder DOM children of `container` to match `saved`. Items missing
 * from `saved` (e.g. a new module shipped after the user saved their
 * order) are appended at the end in their original document order so
 * they remain reachable.
 */
function applySavedOrder(
  container: HTMLElement,
  itemSelector: string,
  keyAttr: string,
  saved: string[]
): void {
  const items = Array.from(
    container.querySelectorAll<HTMLElement>(itemSelector)
  );
  const byKey = new Map<string, HTMLElement>();
  items.forEach(el => {
    const k = readKey(el, keyAttr);
    if (k) byKey.set(k, el);
  });

  saved.forEach(k => {
    const el = byKey.get(k);
    if (el) container.appendChild(el);
  });

  items.forEach(el => {
    const k = readKey(el, keyAttr);
    if (k && !saved.includes(k)) container.appendChild(el);
  });
}

function vibrate(pattern: number | number[]): void {
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw on user-activation rules.
  }
}

function ensureDoneButton(): HTMLButtonElement {
  if (doneButton) return doneButton;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'reorder-done-btn';
  btn.className = 'reorder-done-btn';
  btn.textContent = 'Done';
  btn.setAttribute('aria-label', 'Finish reordering');
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
  editMode = true;
  document.body.classList.add('module-edit-mode');
  ensureDoneButton().classList.add('is-visible');
}

function exitEditMode(): void {
  if (!editMode) return;
  editMode = false;
  document.body.classList.remove('module-edit-mode');
  doneButton?.classList.remove('is-visible');
  // Persist final order for both containers.
  wiredContainers.forEach(({ spec, container }) => {
    const order = readCurrentOrder(container, spec.itemSelector, spec.keyAttr);
    saveOrder(spec.key, order);
  });
}

function buildGhost(item: HTMLElement): HTMLElement {
  const rect = item.getBoundingClientRect();
  const clone = item.cloneNode(true) as HTMLElement;
  clone.classList.add('module-drag-ghost');
  clone.removeAttribute('id');
  clone.setAttribute('aria-hidden', 'true');
  clone.style.position = 'fixed';
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = '1000';
  document.body.appendChild(clone);
  return clone;
}

function moveGhost(ghost: HTMLElement, x: number, y: number): void {
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
}

function findInsertionTarget(
  container: HTMLElement,
  itemSelector: string,
  pointerX: number,
  pointerY: number,
  draggedItem: HTMLElement
): { reference: HTMLElement; before: boolean } | null {
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(itemSelector)
  ).filter(el => el !== draggedItem && !el.hidden);

  let closest: HTMLElement | null = null;
  let closestDist = Infinity;

  candidates.forEach(el => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dist = (cx - pointerX) ** 2 + (cy - pointerY) ** 2;
    if (dist < closestDist) {
      closestDist = dist;
      closest = el;
    }
  });

  if (!closest) return null;
  const ref = closest as HTMLElement;
  const r = ref.getBoundingClientRect();
  // Carousel items are wider than tall; grid items are roughly square.
  // Use the major axis for the before/after split.
  const horizontal = r.width >= r.height;
  const before = horizontal
    ? pointerX < r.left + r.width / 2
    : pointerY < r.top + r.height / 2;
  return { reference: ref, before };
}

function startDrag(
  e: PointerEvent,
  item: HTMLElement,
  container: HTMLElement,
  spec: ContainerSpec
): void {
  const rect = item.getBoundingClientRect();
  const ghost = buildGhost(item);
  drag = {
    pointerId: e.pointerId,
    item,
    container,
    spec,
    ghost,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };
  item.classList.add('module-dragging-source');
  document.body.classList.add('module-dragging');
  try {
    item.setPointerCapture(e.pointerId);
  } catch {
    // Capture can fail if the pointer is no longer down.
  }
}

function endDrag(): void {
  if (!drag) return;
  const { item, ghost, pointerId } = drag;
  try {
    item.releasePointerCapture(pointerId);
  } catch {
    // Capture may have already been released.
  }
  ghost.remove();
  item.classList.remove('module-dragging-source');
  document.body.classList.remove('module-dragging');
  drag = null;
}

function clearPress(): void {
  if (press) {
    window.clearTimeout(press.timer);
    press = null;
  }
}

function findOwningSpec(
  el: HTMLElement
): { container: HTMLElement; spec: ContainerSpec; item: HTMLElement } | null {
  for (const { spec, container } of wiredContainers) {
    const item = el.closest<HTMLElement>(spec.itemSelector);
    if (item && container.contains(item)) {
      return { container, spec, item };
    }
  }
  return null;
}

function onPointerDown(e: PointerEvent): void {
  if (typeof e.button === 'number' && e.button !== 0) return;
  // Ignore touches on the Done button etc.
  const target = e.target as HTMLElement | null;
  if (!target) return;

  // Tapping outside any tile while in edit mode exits edit mode.
  const owning = findOwningSpec(target);
  if (!owning) {
    if (editMode && !target.closest('#reorder-done-btn')) {
      exitEditMode();
    }
    return;
  }

  if (drag || press) return;

  const { container, spec, item } = owning;

  // Arm a hold timer. The threshold differs by mode:
  //   - Not in edit mode: a long press (LONG_PRESS_MS) opens edit mode
  //     and starts the drag in the same gesture.
  //   - Already in edit mode: a brief hold (EDIT_DRAG_HOLD_MS) starts a
  //     drag. This still leaves a short window where movement falls
  //     through to native scroll on the carousel.
  // In both modes, movement >MOVE_THRESHOLD_PX before the timer fires
  // cancels — that's a scroll/swipe, not a pickup.
  const isEntry = !editMode;
  const holdMs = isEntry ? LONG_PRESS_MS : EDIT_DRAG_HOLD_MS;
  press = {
    pointerId: e.pointerId,
    item,
    container,
    spec,
    startX: e.clientX,
    startY: e.clientY,
    timer: window.setTimeout(() => {
      const p = press;
      if (!p) return;
      press = null;
      if (isEntry) {
        enterEditMode();
        vibrate(15);
      } else {
        vibrate(8);
      }
      const fakeEvent = {
        pointerId: p.pointerId,
        clientX: p.startX,
        clientY: p.startY,
      } as PointerEvent;
      startDrag(fakeEvent, p.item, p.container, p.spec);
      // Suppress the click that would otherwise fire on this same tile
      // when the user finally lifts their finger.
      suppressNextClickOn = p.item;
    }, holdMs),
  };
}

function onPointerMove(e: PointerEvent): void {
  if (drag && e.pointerId === drag.pointerId) {
    e.preventDefault();
    moveGhost(
      drag.ghost,
      e.clientX - drag.offsetX,
      e.clientY - drag.offsetY
    );
    const target = findInsertionTarget(
      drag.container,
      drag.spec.itemSelector,
      e.clientX,
      e.clientY,
      drag.item
    );
    if (!target) return;
    if (target.before) {
      if (target.reference !== drag.item.nextSibling) {
        drag.container.insertBefore(drag.item, target.reference);
      }
    } else if (target.reference.nextSibling !== drag.item) {
      drag.container.insertBefore(drag.item, target.reference.nextSibling);
    }
    return;
  }

  if (press && e.pointerId === press.pointerId) {
    const dx = Math.abs(e.clientX - press.startX);
    const dy = Math.abs(e.clientY - press.startY);
    if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
      // Pointer moved before long-press fired — treat as scroll/cancel.
      clearPress();
    }
  }
}

function onPointerUpOrCancel(e: PointerEvent): void {
  if (drag && e.pointerId === drag.pointerId) {
    const item = drag.item;
    endDrag();
    suppressNextClickOn = item;
    vibrate(10);
    return;
  }
  if (press && e.pointerId === press.pointerId) {
    clearPress();
  }
}

function onClickCapture(e: MouseEvent): void {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const tile = target.closest<HTMLElement>('.nav-item, .module-card');
  if (suppressNextClickOn && tile === suppressNextClickOn) {
    e.preventDefault();
    e.stopPropagation();
    suppressNextClickOn = null;
    return;
  }
  if (editMode && tile) {
    // While in edit mode tapping a tile must not navigate / open modals.
    e.preventDefault();
    e.stopPropagation();
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (editMode && e.key === 'Escape') {
    e.preventDefault();
    exitEditMode();
  }
}

function setupContainer(spec: ContainerSpec): HTMLElement | null {
  const container = document.querySelector<HTMLElement>(spec.containerSelector);
  if (!container) return null;

  const saved = loadOrder(spec.key);
  if (saved) {
    applySavedOrder(container, spec.itemSelector, spec.keyAttr, saved);
  }
  return container;
}

export function initializeModuleReorder(): void {
  wiredContainers = [];
  SPECS.forEach(spec => {
    const container = setupContainer(spec);
    if (container) wiredContainers.push({ spec, container });
  });
  if (wiredContainers.length === 0) return;

  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUpOrCancel);
  document.addEventListener('pointercancel', onPointerUpOrCancel);
  document.addEventListener('click', onClickCapture, { capture: true });
  document.addEventListener('keydown', onKeyDown);
}
