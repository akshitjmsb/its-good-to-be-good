# Todo module

- **id:** `todo`
- **category:** journey
- **surface:** page (`todo.html`)
- **renderer:** react
- **permissions:** storage, cache

## Purpose

The day's task list — a focused checklist that survives reloads. The
React app is the canonical UI; this module is the home-side handle that
routes to it.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — `init` calls `navigateTodoPage()`. The real React
  app lives at `src/todo.tsx` (Vite entry for `todo.html`).
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

## Back-compat

The home's nav still calls into `navigateTodoPage` via the registry —
it's the same name the legacy code used. The actual page entry at
`src/todo.tsx` is unchanged.

## Guardrails

- `navigateTodoPage` no-ops if `window` is undefined (test runner).
