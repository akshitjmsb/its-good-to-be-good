# Food module

- **id:** `food`
- **ring:** circle (soul practice — acts in place on the home)
- **renderer:** dom

## Purpose

A calm meal-planning practice, opened in the home activity stage. Calendar at
top, one-day plan below — Breakfast, Lunch, Dinner, Snack. Tuesdays and
Thursdays are vegetarian-only; other days draw from the combined veg + non-veg
pool. Meal check-offs last only for the open practice and clear when the user
returns to stillness.

## Files

- `manifest.json` — module metadata (the manifest IS the registry).
- `view.ts` — calendar grid, day panel, meal cards, click handling; mounted
  by `src/modules/being/orbit.ts` into the home activity stage.
- `data.ts` — meal pool and the deterministic per-week shuffle.
- `types.ts` — re-exports the public types from `data.ts`.
- `food.css` — panel styles (imported by `orbit.ts`).
- `icon.svg` — module icon.
- `__tests__/` — data pool integrity.

## Guardrails

- All meal names and ingredient strings render through
  `createSafeHtml` / `escapeHtml`.
- Food is intentionally session-only: it must not write a record or retain
  check-offs after the practice is closed.
