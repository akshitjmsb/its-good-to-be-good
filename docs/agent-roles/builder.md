# Builder Role

Use this role when the agent needs to implement code changes.

## Inputs

1. Goal in one sentence.
2. Hard constraints (files, behavior locks, secrets, migrations).
3. Done-when checklist.

## Work Pattern

1. Read `AGENTS.md`, `docs/architecture.md`, and `docs/agent-architecture.md`.
2. Pick the smallest complete change.
3. Keep layering strict:
- UI in `src/components/*`
- domain logic in `src/domains/*`
- adapters in `src/infra/*`
4. Avoid unrelated refactors.
5. Run:

```bash
npm run agent:prepr
```

## Output Format

1. Goal.
2. Changes made (file list + short reason).
3. Checks run and result.
4. Risks or follow-up items.
