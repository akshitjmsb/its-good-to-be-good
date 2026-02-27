# Agent Playbook

## Pick A Role First

1. `Builder`: [docs/agent-roles/builder.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/docs/agent-roles/builder.md)
2. `Reviewer`: [docs/agent-roles/reviewer.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/docs/agent-roles/reviewer.md)
3. `QA`: [docs/agent-roles/qa.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/docs/agent-roles/qa.md)

## Safe Change Workflow

1. Read `AGENTS.md`, `docs/architecture.md`, and `docs/agent-architecture.md`.
2. Stay inside layer boundaries (`app`, `components`, `domains`, `infra`).
3. Implement the smallest complete change.
4. Run one pre-PR command:

```bash
npm run agent:prepr
```

5. Share output in this order:
- goal
- changes
- checks
- risks

## Agent Pre-PR Command

`npm run agent:prepr` runs:

1. `npm run verify` (type-check, lint, tests, architecture check, build)
2. `npm run check:architecture` (explicit second architecture gate)
3. `npm run test:changed` (only changed test files from git diff)

Diff base for changed tests:

1. default: `origin/prod`
2. override:

```bash
AGENT_BASE_REF=origin/main npm run test:changed
```

## Where To Add Modules vs Tools

### Add A New Module

1. Add module metadata in `src/domains/modules/registry.data.js`.
2. Keep canonical module IDs and category (`journey` or `learn`).
3. Wire Learn module handlers through `src/components/modals/modalManager.ts`.
4. Keep UI selectors and `data-module` aligned with the registry.

### Add A New Tool

1. Runtime tools belong in `src/infra/*` or `src/utils/*`.
2. Dev tools belong in npm scripts, CI workflows, or setup scripts.
3. Tools must not become user-facing modules unless intentionally promoted.

## Migration / Schema Changes

1. Create a new migration in `supabase/migrations`.
2. Keep runtime types aligned with DB constraints.
3. Validate with `npm run supabase:push`.

## Environment And Secrets

1. Use `.env.local` for local secrets.
2. Never commit tokens/keys.
3. Use `.env.example` for placeholders only.

## Behavior Locks

1. Preserve `home-vintage-lock` unless explicitly requested.
2. Preserve local Supabase-first runtime.
3. Preserve `french.html` as standalone entrypoint.
