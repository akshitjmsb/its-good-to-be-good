# Poetry module

- **id:** `poetry`
- **category:** learn
- **surface:** modal
- **renderer:** dom
- **permissions:** ai, storage (Supabase persistence of recent poets / languages)

## Purpose

Picks one famous couplet per open — biased to a poet/language the user
hasn't seen recently. Renders the scene that led up to the couplet, the
couplet itself with transliteration and translation, and a short bio.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — `init`/`destroy` lifecycle and the legacy
  `fetchAndShowPoetry(date)` entry kept for `modalManager.ts`.
- `view.ts` — escaped HTML rendering for the moment and a raw-text fallback.
- `data.ts` — prompt builder, JSON shape guard, response schema.
- `types.ts` — `PoetryMoment` shape.
- `icon.svg` — module icon.
- `__tests__/` — controller surface + JSON shape guard.

## Back-compat

`src/components/modals/poetryModal.ts` re-exports `fetchAndShowPoetry`
from this module. Per-folder shims under `src/components/modals/poetry/`
keep the legacy import paths working.

## Guardrails

- All AI output runs through `escapeHtml` / `createSafeHtml` before
  rendering. Even valid JSON values are user-visible strings.
- The recents list lives in `infra/supabase/persistence` — kept there
  because it's a shared persistence pattern, not module-local state.
