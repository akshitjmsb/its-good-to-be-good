# Agent Contract

This file defines how AI agents should work safely in this repository.

## Architecture Map

- `src/app/*`: app orchestration (bootstrap, scheduling, render wiring, state glue).
- `src/domains/*`: domain logic and typed contracts.
- `src/infra/*`: external adapters (Supabase, AI clients, persistence/cache).
- `src/components/*`: UI modules and modal behavior.
- `src/apps/french-translator/*`: isolated French translator app.

## Locked Invariants

1. Home design lock must remain unchanged unless explicitly requested:

- `index.html` uses `body.home-vintage-lock`
- `src/styles/home-lock.css` is the visual guardrail

2. Runtime model is local Supabase-first:

- single anonymous user: `00000000-0000-0000-0000-000000000000`
- content path: `Supabase cache -> Perplexity -> local fallback`

3. Secret handling:

- keys belong only in `.env.local`
- never commit `.env.local` or any real credentials

## Required Verification Before Commit

Run and pass:

```bash
npm run verify
```

## Migration Protocol

1. Schema changes require a new file under `supabase/migrations/`.
2. Do not edit old migration files to change history.
3. Keep runtime union types in sync with DB constraints.
4. Validate with:

```bash
npm run supabase:push
```

## File Ownership Guidance

Active:

- `src/app`, `src/domains`, `src/infra`, `src/components`, `src/apps`, `src/styles`, `supabase/migrations`

Legacy/Archive:

- root status markdowns moved to `docs/archive/`
- avoid reintroducing removed feature paths unless requested

## Change Discipline

1. Prefer small, typed interfaces over broad `any`.
2. Keep user-visible behavior stable unless scope says otherwise.
3. Re-export old paths only when needed for gradual migration.
