# Todo module

- **id:** `todo`
- **ring:** square (purpose tool — opens its own page)
- **page:** `todo.html`, mounted by `entry.ts`
- **renderer:** dom
- **permissions:** storage (localStorage write-ahead log), timer (background sync)

## Purpose

The day's task list — a focused checklist with a supporting rich-text note
for each task. It survives reloads, crashes, and offline spells. The page is
plain TypeScript + DOM (no framework); this module is the home-side handle
that routes to it.

Jarvis pairing is kept behind one disclosure. Save state appears only when it
has something meaningful to report; task counts and note helper prose stay out
of the primary view.

## Architecture

- `manifest.json` — module metadata.
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

The page entry is `src/modules/todo/entry.ts` (Vite entry for `todo.html`). It is a thin
DOM layer over pure, unit-tested logic in `src/modules/todo/`:

- `model.ts` — ordering, the bidirectional parent/child completion cascade,
  position reindexing, the non-destructive id-based sync merge, and the
  `canSync` guard.
- `save-controller.ts` — the serialized save queue: derived dirty flag (only
  cleared on confirmed success), exponential-backoff retry, offline fallback,
  auth-gated pause/resume, and optional short network batching for continuous
  editor input.
- `wal.ts` — the localStorage write-ahead log (injectable storage).
- `rich-text.ts` — a small semantic allow-list for notes (`p`, emphasis,
  headings, lists, quotes); attributes and executable markup never persist
  back into the editor.

Persistence (`src/platform/convex/persistence.ts`) is an upsert keyed on the
client-generated `id` plus *explicit delete tombstones* — it never deletes
"everything not in my local list", so a second device's tasks are safe.

## Reliability guarantees

- **No silent loss:** every mutation, including each note edit, is WAL'd to
  localStorage before the save. Rich-text requests are batched for 350ms only
  after the journal is durable. A save failure retries (1s/2s/4s) then shows
  "Offline — changes saved locally"; work stays queued and flushes when the
  network/auth returns. If device storage itself rejects the WAL, the page
  says so plainly and never claims a local backup exists.
- **Non-destructive sync:** the 30s background sync merges by id
  (last-writer-wins on `updated_at`) and is skipped while editing a title,
  note, dragging, typing a subtask, or while local work is unsaved/failed.
- **Cross-device safety:** the server rejects a stale record revision rather
  than overwriting a newer task/note; revisioned delete tombstones stop an
  old offline snapshot from recreating a deliberately deleted task.
- **Crash-safe:** closing or crashing mid-outage loses nothing — the next boot
  merges the WAL with the server.

## Guardrails

- `navigateTodoPage` no-ops if `window` is undefined (test runner).
- The `src/modules/todo/` modules are pure (no DOM, no network, injected
  IO/clock) so they are fully tested in the Node test environment.
