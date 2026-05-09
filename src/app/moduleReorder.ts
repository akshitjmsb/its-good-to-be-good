/**
 * Drag-to-reorder for the home-page module containers.
 *
 * Two containers — the journey carousel (`.nav-carousel`) and the learn
 * grid (`.category-grid`) — each get an independent saved order keyed
 * by `data-module`. We use Pointer Events (works for both touch + mouse,
 * unlike HTML5 drag-and-drop which has no touch support).
 *
 * Interaction model:
 *   1. Long-press a tile (~400 ms with no movement). The tile lifts via
 *      .module-dragging; the container gains .module-reordering so
 *      siblings can dim slightly.
 *   2. Drag — on each pointermove we hit-test against the closest
 *      sibling and reorder DOM (insertBefore) so the layout snaps live.
 *   3. Release — persist the new order to localStorage. Suppress the
 *      synthesised `click` that would otherwise fire on the same
 *      element (which would navigate or open a modal).
 *
 * If the user moves the pointer >MOVE_THRESHOLD_PX before the long-press
 * fires, we cancel — that gesture was a scroll, not a drag.
 */

const STORAGE_PREFIX = 'module.order.';
const LONG_PRESS_MS = 400;
const MOVE_THRESHOLD_PX = 6;

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

function loadOrder(key: ContainerKey): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every(v => typeof v === 'string')) return null;
    return parsed;
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
 * order) are appended at the end in their original document order.
 */
function applySavedOrder(
  container: HTMLElement,
  itemSelector: string,
  keyAttr: string,
  saved: string[]
): void {
  const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
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

/**
 * Find the sibling closest (by center) to the pointer, plus whether the
 * dragged item should be inserted before or after it.
 */
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
  const r = (closest as HTMLElement).getBoundingClientRect();
  // Carousel items are wider than tall; grid items are roughly square.
  // Use the major axis for the before/after split.
  const horizontal = r.width >= r.height;
  const before = horizontal
    ? pointerX < r.left + r.width / 2
    : pointerY < r.top + r.height / 2;
  return { reference: closest as HTMLElement, before };
}

function wireItem(
  item: HTMLElement,
  container: HTMLElement,
  itemSelector: string,
  keyAttr: string,
  storageKey: ContainerKey
): void {
  let timer: number | null = null;
  let active = false;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let suppressNextClick = false;

  const cancelTimer = (): void => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const exitDrag = (): void => {
    if (active) {
      item.classList.remove('module-dragging');
      container.classList.remove('module-reordering');
      if (pointerId !== null) {
        try {
          item.releasePointerCapture(pointerId);
        } catch {
          // Capture may have already been released.
        }
      }
    }
    cancelTimer();
    active = false;
    pointerId = null;
  };

  item.addEventListener('pointerdown', (e: PointerEvent) => {
    if (active || pointerId !== null) return;
    if (typeof e.button === 'number' && e.button !== 0) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    timer = window.setTimeout(() => {
      timer = null;
      active = true;
      item.classList.add('module-dragging');
      container.classList.add('module-reordering');
      try {
        if (pointerId !== null) item.setPointerCapture(pointerId);
      } catch {
        // Capture can fail if the pointer is no longer down.
      }
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(15);
        } catch {
          // Some browsers throw on user-activation rules.
        }
      }
    }, LONG_PRESS_MS);
  });

  item.addEventListener('pointermove', (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    if (!active) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
        // Pointer moved before long-press fired — treat as scroll/cancel.
        exitDrag();
      }
      return;
    }
    e.preventDefault();
    const target = findInsertionTarget(
      container,
      itemSelector,
      e.clientX,
      e.clientY,
      item
    );
    if (!target) return;
    if (target.before) {
      if (target.reference !== item.nextSibling) {
        container.insertBefore(item, target.reference);
      }
    } else {
      if (target.reference.nextSibling !== item) {
        container.insertBefore(item, target.reference.nextSibling);
      }
    }
  });

  const finalize = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    const wasActive = active;
    exitDrag();
    if (wasActive) {
      suppressNextClick = true;
      const order = readCurrentOrder(container, itemSelector, keyAttr);
      saveOrder(storageKey, order);
    }
  };

  item.addEventListener('pointerup', finalize);
  item.addEventListener('pointercancel', finalize);

  item.addEventListener(
    'click',
    (e: MouseEvent) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  item.addEventListener('contextmenu', (e: Event) => {
    if (active || timer !== null) e.preventDefault();
  });
}

function setupContainer(spec: ContainerSpec): void {
  const container = document.querySelector<HTMLElement>(spec.containerSelector);
  if (!container) return;

  const saved = loadOrder(spec.key);
  if (saved) {
    applySavedOrder(container, spec.itemSelector, spec.keyAttr, saved);
  }

  const items = Array.from(
    container.querySelectorAll<HTMLElement>(spec.itemSelector)
  );
  items.forEach(item =>
    wireItem(item, container, spec.itemSelector, spec.keyAttr, spec.key)
  );
}

export function initializeModuleReorder(): void {
  SPECS.forEach(setupContainer);
}
