# Being module

- **id:** `being`
- **category:** journey
- **surface:** page (`being.html`)
- **renderer:** dom
- **permissions:** timer, storage

## Purpose

A single "wellbeing" canvas merging two practices behind a two-tab
interface:

- **Meditate** — sit-and-breathe timer with optional 4-4-4-4 box-breathing
  chimes, an OM loop, and a sleep-music loop. The page entry handles the
  iOS audio-unlock subtleties.
- **Exercise** — deterministic, fully-offline PPL + Upper schedule with a
  month calendar, muscle-focus chips, and compact exercise cards.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — navigation handle (`navigateBeingPage`). The page entry
  lives at `src/pages/being.ts` (Vite entry for `being.html`).
- `icon.svg` — module icon (monoline lotus).
- `exercise-view.ts` — Exercise tab renderer (calendar + cards + stretches).
- `exercise-data.ts` — Exercise schedule + pools, deterministic and offline.
- `__tests__/` — controller surface + exercise-data coverage.

## Notes

The Meditate tab's UI/runtime is shared from `src/pages/meditate.ts`, which
exports `initMeditate()`. Being's page entry calls it for the Meditate tab and
renders `exercise-view` into the Exercise tab.
