# Curious module

- **id:** `curious`
- **legacy name:** "Under the Hood" — modalManager handler is still `showHoodModal`
- **category:** learn
- **surface:** modal
- **renderer:** dom
- **permissions:** cache (the content service caches the daily explainer)

## Purpose

Pulls the day's physics deep-dive from the content service and drops it
into the modal as a sanitised explanation. One topic per day, server-cached.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — `init`/`destroy` plus the legacy `showHoodModal(date)`
  entry still mapped in `modalManager.ts`.
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

## Back-compat

`src/components/modals/hoodModal.ts` is now a re-export shim. The
modalManager keeps calling `showHoodModal` from the legacy path.

## Guardrails

- `getPhysicsContent` returns AI-derived text; render only through
  `createSafeHtml` and never inject the raw payload.
