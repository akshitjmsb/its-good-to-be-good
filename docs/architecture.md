# Architecture Overview

## The idea

The app is the orbit: da Vinci's Vitruvian Man at the centre of the home,
with two rings around him —

- **Circle (soul)** — five pillars that act in place and leave nothing
  behind: Sleep, Food, Movement, Mindfulness, Rooh. Breathe, OM, and Focus
  remain immediate actions inside Mindfulness. Circle experiences never
  navigate.
- **Square (purpose)** — tools that open their own page and accumulate a
  record: To do, Khyaali Bhoot, Tennis.

The membership test: *does using it leave something behind?*

## Runtime

- Multi-page Vite PWA (one HTML entry per square tool + the home),
  vanilla TypeScript, no frameworks.
- Backend: Convex (`convex/`) with real auth via `@convex-dev/auth`.
  Identity is taken from the authenticated Convex context server-side.
- No service worker is registered; launches load the current shell from the
  CDN. To Do survives crash/offline via a localStorage WAL (see Resilience).

## Layers

```
modules/<id>/   the feature: manifest.json (the registry), entry.ts,
                views, data, css, icon, AGENT.md, __tests__/
home/           shell: entry, bootstrap (auth gate, chip, clock, timer,
                orbit init)
platform/       foundation: convex client/persistence, auth, timers,
                store, time
sdk/            module contract: storage, timer, events, ui, user,
                durable (WAL + SaveController)
styles/         shared tokens + home lock
utils/          escapeHtml, date, error handling
```

Rules (enforced by `npm run check:architecture`):

- `platform/`, `sdk/`, `utils/` never import `home/` or `modules/`.
- Modules import only their own folder, `sdk/`, `platform/`, `utils/`,
  `types` — never `home/`, never each other.
- Circle manifests have no `routeHref`; square manifests must have one,
  the page must exist, the home must link it, and the page must load the
  module's `entry.ts`.
- The five pillar hooks and three zero-barrier Mindfulness actions must exist
  in the home markup.

## The manifest is the registry

There is no separate registry file. `src/modules/<id>/manifest.json`
declares `id`, `displayName`, `ring`, `routeHref` (square only), `icon`,
`version`, `renderer`, `permissions`. The expected module set lives in
`EXPECTED_MODULES` in `scripts/check-architecture.mjs` and changes only
on purpose.

## Resilience

`src/sdk/durable.ts` is the standard pattern for server-synced records
(extracted from To Do, where each piece maps to a real data-loss bug):

1. **WAL** — every mutation writes a full snapshot to localStorage
   *before* the network save. Corrupt WALs read as absent. Missing
   localStorage degrades to safe no-ops.
2. **SaveController** — serialized saves; dirty is derived
   (`mutationSeq > savedSeq`) and only cleared by a confirmed success;
   failures retry with backoff then park in `offline` with the work still
   queued; sign-out pauses, re-auth flushes.

Ephemeral practice state (such as Food's meal check-offs) stays in memory and
clears when the practice closes.

## Anti-patterns

1. Dashboard chrome — carousels, tile grids, in-app module editors.
2. Feature code outside its module folder.
3. Clearing a dirty flag before the server confirms the save.
4. Trusting a client-supplied user id.
5. Broad `any` in platform or sdk code.
