# Exercise module

- **id:** `exercise`
- **category:** learn
- **surface:** modal
- **renderer:** dom
- **permissions:** none — every workout pick is fully local

## Purpose

Push / Pull / Legs / Upper rotation, fixed by day-of-week. Each (week-start
ISO date, workout type) pair is hashed with djb2 to deterministically pick
three exercises from the relevant pool. Includes a stretch-link panel for
the body parts that get hammered most in this rotation.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — `init`/`destroy` plus the legacy
  `showExerciseModal(date)` entry kept for `modalManager.ts`.
- `view.ts` — calendar grid, day panel with muscle chips, exercise cards,
  stretch buttons.
- `data.ts` — exercise pool, muscle-focus map, stretch routines, and
  the deterministic shuffle.
- `icon.svg` — module icon.
- `__tests__/` — pool integrity + controller surface.

## Back-compat

`src/components/modals/exerciseModal.ts` and the per-folder
`src/components/modals/exercise/*` files are now thin re-export shims.

## Guardrails

- All exercise names + instructions render through `createSafeHtml` /
  `escapeHtml`.
- Stretch URLs open with `window.open(url, '_blank', 'noopener')` to
  avoid `window.opener` leakage.
