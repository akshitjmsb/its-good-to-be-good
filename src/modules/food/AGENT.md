# Food module

- **id:** `food`
- **ring:** square (purpose tool — opens its own page)
- **page:** `food.html`, mounted by `entry.ts`
- **renderer:** dom
- **permissions:** storage (per-meal check-off in localStorage)

## Purpose

A curated meal calendar. Calendar at top, one-day plan below — Breakfast,
Lunch, Dinner, Snack. Tuesdays and Thursdays are vegetarian-only; other
days draw from the combined veg + non-veg pool. Per-meal check-off is
persisted in localStorage by ISO date.

## Files

- `manifest.json` — module metadata (the manifest IS the registry).
- `entry.ts` — page entry; mounts `renderFoodView` into `#food-view-host`.
- `view.ts` — calendar grid, day panel, meal cards, click handling.
- `data.ts` — meal pool and the deterministic per-week shuffle.
- `types.ts` — re-exports the public types from `data.ts`.
- `food.css` — page styles (imported by entry.ts).
- `icon.svg` — module icon.
- `__tests__/` — data pool integrity.

## Guardrails

- All meal names and ingredient strings render through
  `createSafeHtml` / `escapeHtml`.
- localStorage writes are wrapped in try/catch so quota / private-mode
  failures fall back to in-memory state.
