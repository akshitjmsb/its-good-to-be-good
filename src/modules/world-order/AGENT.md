# World Order module

- **id:** `world-order`
- **category:** learn
- **surface:** modal
- **renderer:** dom
- **permissions:** ai (uses the configured provider's `googleSearch` tool)

## Purpose

A compact news rundown — single most important Trump headline, five US/Canada
world-order bullets, five India bullets. AI-generated each open, no caching.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — implements `ModuleController` (init/destroy) and
  retains the legacy `fetchAndShowWorldOrder()` entry point still used by
  `src/components/modals/modalManager.ts`.
- `view.ts` — escapes and renders the AI text into safe HTML.
- `types.ts` — shape of the fetched headlines.
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

## Back-compat

`src/components/modals/worldOrderModal.ts` re-exports `fetchAndShowWorldOrder`
from this module so `modalManager.ts` keeps working without edits.

## Guardrails

- Sanitises AI text through `createSafeHtml` before injecting — never trust
  the response.
- Uses the shared modal factory from `core/modal-factory` (not from
  `components/modals/factory`) to stay inside the module-import allowlist.
