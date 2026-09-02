# Food module

- **id:** `food`
- **ring:** circle (soul practice — opens a quiet page, leaves no record)
- **renderer:** dom

## Purpose

A calm body-budget practice on its own page. It leads with
two universal actions: dress the carb, then eat protein and vegetables before
the carb. “Build a meal” reveals a small Greek–Indian food shelf by category.
One tap selects or replaces a food in that category; tapping it again removes
it. The assembled meal appears immediately without save or submit. One
contextual meal idea remains behind a second disclosure. Every day draws from
plant and animal proteins. Beef is the only excluded meat.

Every meal carries required `protein` and `fibre` components plus an optional
`carb`. The disclosed meal idea renders only those fields in that order; the
type and pool tests prevent a naked-carb suggestion from being added later.

## Files

- `manifest.json` — module metadata and `food.html` route.
- `entry.ts` — page entry.
- `view.ts` — meal builder and food pointers mounted on `food.html`.
- `data.ts` — meal pool and the deterministic per-week shuffle.
- `types.ts` — re-exports the public types from `data.ts`.
- `food.css` — page styles imported by `entry.ts`.
- `icon.svg` — module icon.
- `__tests__/` — data pool integrity.

## Guardrails

- All meal names and ingredient strings render through
  `createSafeHtml` / `escapeHtml`.
- The shelf and meal-pool tests reject beef or veal anywhere in Food data.
- Meal building is intentionally ephemeral: no persistence, history, or save.
