# Food module

- **id:** `food`
- **ring:** circle (soul practice — acts in place on the home)
- **renderer:** dom

## Purpose

A calm body-budget practice opened in the home activity stage. It leads with
the meal relevant to the current time and the rule "never eat a naked carb."
The user can move one day backward or forward, reveal the rest of the day's
Breakfast, Lunch, Snack, and Dinner, and check meals off. Tuesdays and
Thursdays are vegetarian-only; other days draw from the combined veg + non-veg
pool. Check-offs last only for the open practice and clear on stillness.

## Files

- `manifest.json` — module metadata (the manifest IS the registry).
- `view.ts` — next-meal cue, compact day navigation, meal cards, click handling; mounted
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
