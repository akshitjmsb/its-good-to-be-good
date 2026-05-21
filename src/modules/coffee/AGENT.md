# Coffee module

- **id:** `coffee`
- **category:** learn
- **surface:** modal
- **renderer:** dom
- **permissions:** none — the menu is fully offline

## Purpose

A curated coffee menu. Shows a deterministic "today's coffee" hero card on
top and the full grouped menu underneath. Each menu entry expands to reveal
ingredients, method, and an origin note. Pure-static data — no API call,
no network, no AI.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — implements `ModuleController` (init/destroy) and
  retains the legacy `showCoffeeMenu(date)` entry point used by
  `src/components/modals/modalManager.ts`.
- `view.ts` — DOM rendering and the expand/collapse click handler.
- `data.ts` — the 28-drink curated pool plus `getTodaysDrink` /
  `getMenuByCategory`.
- `icons.ts` — line-art SVGs for each drink.
- `types.ts` — re-exports the public types from `data.ts`.
- `icon.svg` — module icon (24x24 monoline, used in the home grid).
- `__tests__/` — data and icon coverage.

## Back-compat

The legacy export path `src/components/modals/coffeeModal.ts` re-exports
`showCoffeeMenu` from this module so `modalManager` keeps working without
edits. Once the modal manager moves to the v2 lifecycle, that shim and
the legacy entry point can be removed.

## Guardrails

- Only imports `escapeHtml` from `../../utils/escapeHtml`. No `infra/`,
  no `app/`, no cross-module imports.
- SVGs are author-controlled static strings — exempt from the AI-derived
  innerHTML guard.
