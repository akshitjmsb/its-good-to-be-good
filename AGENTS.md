# Agent Contract

How AI agents work safely in this repository. Read `CLAUDE.md` for the
design system; this file is the operating contract.

## Architecture Map

- `src/modules/<id>/*`: one folder per feature — manifest.json (the
  registry), entry.ts, views, data, styles, icon, AGENT.md, tests.
- `src/home/*`: the shell — entry, bootstrap, login gate, user chip,
  quantum timer widget.
- `src/platform/*`: the foundation — Convex client + persistence, auth
  store/session, timers, store, time.
- `src/sdk/*`: the module contract — storage, timer, events, ui, user,
  durable (WAL + SaveController).
- `src/styles/*`: shared tokens + home lock only.

## Locked Invariants

1. The home design lock: `index.html` uses `body.home-vintage-lock`;
   `src/styles/home-lock.css` is the visual guardrail. The home is the
   orbit — circle pillars and square tools navigate to their own quiet
   pages; only the central reset acts in place. No dashboard chrome.
2. The ring contract (machine-checked): a `circle` module declares one or
   more `routeHrefs`; a `square` module declares one `routeHref`. Every route
   is linked from the home and mounted by an entry in its owning module.
3. Layering (machine-checked): `platform/`, `sdk/`, `utils/` never import
   `home/` or `modules/`; modules import only their own folder + the
   foundation.
4. Backend is Convex with real auth (`@convex-dev/auth`). Identity comes
   from the authenticated Convex context server-side — never trust a
   client-supplied user id.
5. Secrets belong only in `.env.local`. Never commit credentials.
6. Vanilla TS + HTML only. No React, no frameworks.
7. Mobile first: verify at ~375×812 before desktop.
8. The `CLAUDE.md` mission and five pointers are binding: apply its decision
   filter to every user-visible change. Every feature must make a meaningful
   action easier, lead with zero barrier, retain only essentials, and preserve
   calm trust.
9. Do not add or rewrite user-facing copy unless it is a meaningful pointer
   within the requested scope. Treat existing copy as approved; new copy must
   be explicitly approved by the Product Owner before shipping.
10. The Jadugar contemplation verse (`index.html .being-verse`) is protected
    Product Owner-approved copy. Do not shorten, rewrite, translate, relocate,
    or remove it without explicit Product Owner direction. Keep it visible in
    the home resting state and never show it on a Sukoon module page.

## Data Safety

- Any module that syncs a record to the server uses the SDK durable
  primitives (`src/sdk/durable.ts`): WAL before network, SaveController
  with confirmed-save dirty tracking. To Do is the reference
  implementation.
- Never write a save path that clears "dirty" before the server confirms.
- Escape all user/content strings through `escapeHtml`/`createSafeHtml`
  before `innerHTML`.

## Required Verification Before Commit

```bash
npm run verify        # type-check + lint + tests + architecture guard + build
```

For agent PR prep:

```bash
npm run agent:prepr
```

## Convex Changes

1. Schema lives in `convex/schema.ts`; functions in `convex/*.ts`.
2. Regenerate types with `npm run convex:codegen` after changing functions.
3. Dropping a table loses data — export first (`npx convex export`) and
   get explicit approval.

## Change Discipline

1. Prefer small, typed interfaces over broad `any`.
2. Keep user-visible behavior stable unless scope says otherwise.
3. A feature's code lives in its module folder — don't smear it across
   layers.
4. Adding a module: `npm run new:module <id>`, then follow the guard's
   three wiring steps.
5. Before adding a control, state, screen, or stored field, show why the
   existing module cannot deliver the action without it.
6. On the initial view, keep one primary action. Put alternatives and
   explanation behind progressive disclosure.
7. Do not add streaks, scores, urgency, reminders, or engagement mechanics
   without explicit Product Owner direction.
