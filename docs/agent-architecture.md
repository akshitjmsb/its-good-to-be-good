# Agent-Operable Architecture

This document defines the architecture contract that AI agents can safely extend.

## Goals

1. Keep changes local and predictable.
2. Make layering machine-checkable.
3. Keep runtime behavior stable while enabling rapid feature iteration.

## Layer Contract

1. `src/app/*`
Purpose: bootstrap, scheduler, page orchestration.
Allowed imports: `src/components/*`, `src/domains/*`, `src/infra/*`, `src/utils/*`.
Forbidden: direct schema/migration edits.

2. `src/components/*`
Purpose: UI rendering, DOM events, modal/page interactions.
Allowed imports: `src/domains/*`, `src/utils/*`, `src/core/default-user.ts`.
Forbidden: direct model text injection into `innerHTML` without escaping.

3. `src/domains/*`
Purpose: typed domain models and service contracts.
Allowed imports: `src/infra/*`, `src/utils/*`.
Forbidden: `src/app/*`, `src/components/*`, raw DOM APIs.

4. `src/infra/*`
Purpose: Supabase and AI adapters.
Allowed imports: `src/lib/*`, `src/utils/*`, `src/domains/*` types.
Forbidden: UI imports and UI decisions.

5. `archive/experimental-src/*`
Purpose: archived experiments and deprecated source snapshots.
Allowed imports: none from active runtime.
Forbidden: any import from `src/*` to this path.

## AI Content Safety Boundary

1. Treat all AI output as untrusted text.
2. Escape before rendering with `escapeHtml` or `createSafeHtml`.
3. Do not pass `response.text` directly into `innerHTML`/`setModalContent`.
4. Keep rendered markup templates static; only interpolate escaped values.

## Canonical Data Flow

For generated content modules:

1. UI triggers domain service.
2. Domain service calls infra adapter.
3. Infra adapter resolves with cache-first chain:
   - Supabase cache
   - Perplexity generation
   - local fallback
4. UI renders escaped domain result.

## Module Extension Workflow

1. Add module metadata in `src/domains/modules/registry.data.js`.
2. Ensure module ID/category is valid in `src/domains/modules/types.ts`.
3. Wire handler in `src/components/modals/modalManager.ts`.
4. Add or reuse domain service in `src/domains/content/service.ts`.
5. Add/update infra adapter only in `src/infra/*`.
6. Run `npm run verify`.

## Automated Guardrails

`npm run check:architecture` enforces:

1. Canonical module sets and registry fields.
2. Learn-module selector/modal wiring.
3. Domain/infra import boundaries.
4. Analytics/Exercise controllers using domain services instead of direct AI adapter imports.
5. Rejection of direct `response.text` HTML injection patterns.

## Agent Change Package (Minimum)

Every agent PR should include:

1. Code diff.
2. Updated tests/checks if behavior changed.
3. Verification output from `npm run verify`.
4. Residual risk notes.
