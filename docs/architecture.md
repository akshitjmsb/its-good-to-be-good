# Architecture Overview

## Runtime Context

The application is a local-first personal dashboard with a single local anonymous user model.

- User ID: `00000000-0000-0000-0000-000000000000`
- Data backend: local Supabase
- AI backend: browser-side Perplexity client (fallback-safe)

## Request and Data Flow

1. User triggers feature from UI (`src/components/*`, `src/apps/*`).
2. Domain services resolve typed requests (`src/domains/*`).
3. Infra adapters handle external I/O (`src/infra/supabase/*`, `src/infra/ai/*`).
4. Cache-first sequence is enforced where applicable:

- Supabase cache
- Perplexity generation
- local fallback

## Layer Responsibilities

### `src/app`

- Owns app bootstrap and scheduling.
- Wires UI events to domain/infra functions.
- Keeps orchestration logic out of infra.

### `src/domains`

- Owns domain DTOs and business rules.
- Must not import raw DOM APIs.
- May depend on infra through explicit functions.

### `src/infra`

- Owns API clients, persistence, and adapter details.
- No UI decisions.
- Must return typed responses or typed errors.

## Module vs Tool

| Term   | Meaning | Examples |
| --- | --- | --- |
| Module | User-facing feature | `analytics`, `food`, `todo`, `french` |
| Tool | Internal reusable capability | `src/infra/supabase/*`, `src/utils/*`, modal helper utilities |

### Module Taxonomy

| Module Category | IDs | Surface |
| --- | --- | --- |
| Journey | `todo`, `quantum`, `meditate`, `money`, `health`, `travel` | Page |
| Learn | `world-order`, `tennis`, `coffee`, `guitar`, `poetry`, `french`, `food`, `analytics`, `curious`, `exercise` | Modal or page |

Notes:
- `french` is a Learn Module by entry-point rule (it appears in Learn), even though its surface is a dedicated page.
- Canonical module metadata lives in `src/domains/modules/registry.ts`.
- `npm run check:architecture` enforces registry and layer-boundary guardrails.

## Anti-Patterns to Avoid

1. Adding new feature logic directly into `src/index.tsx`.
2. Broad `any` in domain or infra modules.
3. Re-adding dead runtime branches (archive/night/history) without scope approval.
4. Silent script placeholders that always pass quality gates.
