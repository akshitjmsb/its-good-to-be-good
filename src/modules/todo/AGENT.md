# Todo module

- **id:** `todo`
- **ring:** square (purpose tool — opens its own page)
- **page:** `todo.html`, mounted by `entry.ts`
- **renderer:** dom
- **permissions:** storage (localStorage write-ahead log), timer (background sync)

## Purpose

The day's task list — a focused checklist that survives reloads, crashes,
and offline spells. The page is plain TypeScript + DOM (no framework); this
module is the home-side handle that routes to it.

## Architecture

- `manifest.json` — module metadata.
- `controller.ts` — `init` calls `navigateTodoPage()`.
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

The page entry is `src/modules/todo/entry.ts` (Vite entry for `todo.html`). It is a thin
DOM layer over pure, unit-tested logic in `src/modules/todo/`:

- `model.ts` — ordering, the bidirectional parent/child completion cascade,
  position reindexing, the non-destructive id-based sync merge, and the
  `canSync` guard.
- `save-controller.ts` — the serialized save queue: derived dirty flag (only
  cleared on confirmed success), exponential-backoff retry, offline fallback,
  and auth-gated pause/resume.
- `wal.ts` — the localStorage write-ahead log (injectable storage).

Persistence (`src/platform/convex/persistence.ts`) is an upsert keyed on the
client-generated `id` plus *explicit delete tombstones* — it never deletes
"everything not in my local list", so a second device's tasks are safe.

## Reliability guarantees

- **No silent loss:** every mutation is WAL'd to localStorage before the save.
  A save failure retries (1s/2s/4s) then shows "Offline — changes saved
  locally"; work stays queued and flushes when the network/auth returns.
- **Non-destructive sync:** the 30s background sync merges by id
  (last-writer-wins on `updated_at`) and is skipped while editing, dragging,
  typing a subtask, or while local work is unsaved/failed.
- **Crash-safe:** closing or crashing mid-outage loses nothing — the next boot
  merges the WAL with the server.

## Guardrails

- `navigateTodoPage` no-ops if `window` is undefined (test runner).
- The `src/modules/todo/` modules are pure (no DOM, no network, injected
  IO/clock) so they are fully tested in the Node test environment.
