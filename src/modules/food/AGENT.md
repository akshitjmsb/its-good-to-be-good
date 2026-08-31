# Food module

- **id:** `food`
- **ring:** circle (soul practice — acts in place on the home)
- **renderer:** dom

## Purpose

A calm body-budget practice opened in the home activity stage. It leads with
two universal actions: dress the carb, then eat protein and vegetables before
the carb. One contextual meal idea sits behind progressive disclosure.
Tuesdays and Thursdays are vegetarian-only; other days draw from the combined
veg + non-veg pool.

Every meal carries required `protein` and `fibre` components plus an optional
`carb`. The disclosed meal idea renders only those fields in that order; the
type and pool tests prevent a naked-carb suggestion from being added later.

## Files

- `manifest.json` — module metadata (the manifest IS the registry).
- `view.ts` — next-meal cue and food pointers; mounted
  by `src/modules/being/orbit.ts` into the home activity stage.
- `data.ts` — meal pool and the deterministic per-week shuffle.
- `types.ts` — re-exports the public types from `data.ts`.
- `food.css` — panel styles (imported by `orbit.ts`).
- `icon.svg` — module icon.
- `__tests__/` — data pool integrity.

## Guardrails

- All meal names and ingredient strings render through
  `createSafeHtml` / `escapeHtml`.
- Food is intentionally read-only and session-only.
