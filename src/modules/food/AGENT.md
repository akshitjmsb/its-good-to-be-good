# Food module

- **id:** `food`
- **category:** learn
- **surface:** modal
- **renderer:** dom
- **permissions:** storage (per-meal check-off in localStorage)

## Purpose

A curated meal calendar. Calendar at top, one-day plan below — Breakfast,
Lunch, Dinner, Snack. Tuesdays and Thursdays are vegetarian-only; other
days draw from the combined veg + non-veg pool. Per-meal check-off is
persisted in localStorage by ISO date.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — `init`/`destroy` plus the legacy `showFoodModal(date, todayKey)`
  surface used by `modalManager.ts`.
- `view.ts` — calendar grid, day panel, meal cards, click handling.
- `data.ts` — meal pool and the deterministic per-week shuffle.
- `types.ts` — re-exports the public types from `data.ts`.
- `icon.svg` — module icon.
- `__tests__/` — data pool integrity + controller surface.

## Back-compat

`src/components/modals/foodModal.ts` and the per-folder
`src/components/modals/food/*` files are now thin re-export shims.

## Guardrails

- All meal names and ingredient strings render through
  `createSafeHtml` / `escapeHtml`.
- localStorage writes are wrapped in try/catch so quota / private-mode
  failures fall back to in-memory state.
