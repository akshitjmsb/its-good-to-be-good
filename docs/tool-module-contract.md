# Tool vs Module Contract

This repository uses strict language and ownership rules for AI-agent-safe changes.

## Definitions

- `Module`: a user-facing feature.
- `Tool`: an internal reusable capability that supports modules but is not itself a user-facing feature.

## Module Subtypes

### Journey Modules

- Route/page based experiences.
- Current IDs: `todo`, `quantum`, `meditate`, `money`, `health`, `travel`.

### Learn Modules

- Card-driven learning features (mostly modal flows).
- Current IDs: `world-order`, `tennis`, `coffee`, `guitar`, `poetry`, `french`, `food`, `analytics`, `curious`, `exercise`.
- `french` is a Learn Module even though it opens a dedicated page.

## Naming Rules

Allowed:

- “Open the `analytics` module.”
- “Use Supabase cache tools in `src/infra/supabase/*`.”

Forbidden:

- Calling any user-facing module a tool.
- Calling infra/utils/shared helpers modules.

## Source of Truth

- Module taxonomy and metadata:
  - [types.ts](../src/domains/modules/types.ts)
  - [registry.ts](../src/domains/modules/registry.ts)

## Tool Categories

- Runtime tools:
  - `src/infra/*`
  - `src/utils/*`
  - shared modal utilities in [factory.ts](../src/components/modals/factory.ts)
- Dev tools:
  - npm scripts
  - CI workflows
  - setup scripts

## Guardrails

- Run `npm run check:architecture` before commit.
- `src/domains/*` and `src/infra/*` must not import `src/app/*` or `src/components/*`.
- Keep canonical module IDs in UI metadata (`data-module`) and registry entries.
