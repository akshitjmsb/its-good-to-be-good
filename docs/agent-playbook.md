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
