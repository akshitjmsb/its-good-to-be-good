# Agent Playbook

## Safe Change Workflow

1. Read `AGENTS.md` and `docs/architecture.md`.
2. Locate target boundaries (`app`, `domains`, `infra`, `components`).
3. Implement smallest complete change.
4. Run full verification:

```bash
npm run verify
```

5. Summarize:

- what changed
- why
- tests/checks run
- residual risks

## When Adding New Features

1. Add/extend domain DTOs first.
2. Add infra adapters with strict types.
3. Wire UI last.
4. Add tests before merging.

## Where to Add Modules vs Tools

### Add a New Module

1. Add the module entry to `src/domains/modules/registry.ts`.
2. Use canonical module IDs and category (`journey` or `learn`).
3. Wire Learn module handlers through `src/components/modals/modalManager.ts`.
4. Keep UI selectors and `data-module` aligned with the registry.

### Add a New Tool

1. Runtime tools belong in `src/infra/*` or `src/utils/*`.
2. Dev tools belong in npm scripts, CI workflows, or setup scripts.
3. Tools must not become user-facing modules unless intentionally promoted as product features.

## Migration / Schema Changes

1. Create new migration under `supabase/migrations`.
2. Keep runtime types aligned with migration constraints.
3. Verify local migration apply with `npm run supabase:push`.

## Environment and Secrets

1. Use `.env.local` for all local secrets.
2. Never commit tokens/keys.
3. Use `.env.example` only for placeholders.

## Behavior Locks

1. Preserve home visual lock (`home-vintage-lock`) unless explicitly requested.
2. Preserve local Supabase-first runtime for now.
3. Preserve French page as standalone app entrypoint (`french.html`).

## Required Checks Before Commit

1. Run `npm run check:architecture`.
2. Run `npm run verify`.
