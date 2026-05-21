# Analytics module

- **id:** `analytics`
- **category:** learn
- **surface:** modal
- **renderer:** dom
- **permissions:** ai (solution explanation), cache (analytics content cache)

## Purpose

A swipeable card stack of analytics-engineering topics — SQL / DAX /
Snowflake / dbt practice prompts plus shorter "Data Management" and
"Data Quality" explainers. Each prompt card has a "Show Solution" button
that asks the AI to generate a detailed walkthrough on demand.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — `init`/`destroy` plus the legacy
  `showAnalyticsModal(date)` and `cleanupAnalyticsEventListeners()`
  surfaces still consumed by `modalManager.ts`.
- `view.ts` — per-topic card HTML (escaped).
- `solutionExplanation.ts` — AI request + escaped rendering for the
  "Show Solution" expand.
- `types.ts` — `AnalyticsContent`, `AnalyticsTopic` shapes.
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

## Back-compat

`src/components/modals/analyticsModal.ts` and the per-folder
`src/components/modals/analytics/*` files are now thin re-export shims,
as is `src/components/modals/solutionExplanation.ts`.

## Guardrails

- All AI text passes through `escapeHtml` before injection.
- Prompt + solution payloads are passed as base64 (`btoa`) through
  data attributes — defensive but matches the legacy contract.
- Listener cleanup (keyboard + click) is exposed so `modalManager.ts`
  can detach when the modal closes.
