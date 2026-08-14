# It's Good to Be Good — King design system & conventions

This repo is a personal-life PWA built around one idea, taken from the
drawing at its centre: **the circle holds the soul, the square holds the
work.** The home page (`index.html`) is the orbit — the Vitruvian Man at
the centre, soul practices riding the circle, purpose tools sitting on
the square's corners. Every subpage is a quiet sibling of the home — not
a separate product.

## Product values

These values govern every screen, feature, and piece of copy. They are a
decision filter, not marketing language.

### Core values

1. **Least barrier to entry.** The useful action takes the fewest possible
   taps, decisions, and setup. Prefer an immediately usable default.
2. **Every word earns its place.** No filler, redundant instruction, or
   explanatory prose by default. User-facing text is limited to meaningful,
   Product Owner-approved pointers.
3. **Action before Gyaan.** Present what the user can do before explaining why
   it works.
4. **One clear next move.** Do not make several actions compete for attention.
   Establish one primary action and keep alternatives quiet.
5. **Progressive disclosure.** Keep the first view minimal. Reveal supporting
   detail only when the user asks for it or needs it to continue.

### Implementation guardrails

6. **No unnecessary tracking.** Retain information only when remembering it
   creates real user value. Sukoon remains ephemeral by default.
7. **Calm over engagement.** No streak pressure, guilt, gamification,
   manufactured urgency, or attention traps.
8. **Preserve the visual language.** Use the established King tokens,
   typography, icon style, geometry, and restrained interaction patterns.
9. **Mobile and touch first.** Design for one-handed use, readable hierarchy,
   and comfortable tap targets before adapting to desktop.
10. **Function before expansion.** Improve an existing module before adding a
    new surface, mode, or feature.

For every proposed change, ask: *what is the next useful action, and what can
be removed before it?*

### Protected pointer

The Hindi **Jadugar contemplation verse** in `index.html` (`.being-verse`) is
an important Product Owner-approved pointer and part of the home's emotional
centre. Minimalism does not mean removing it. Preserve its complete wording,
line order, Hindi language, placement below the orbit, and quiet visual
emphasis unless the Product Owner explicitly requests a change to the quote.
It belongs to the home's resting state and is hidden while a Sukoon module is
open, then restored on return to Stillness.

## Aesthetic

A vintage-typewriter, paper-on-desk look. Calm, minimal, monochrome with a
narrow grey ramp. No gradients on chrome, no loud color, no brand accents
beyond the page-specific emoji in each header. The mood is "kept journal",
not "dashboard".

## Tokens

The home design lock lives at `src/styles/home-lock.css` and exposes the
canonical tokens via CSS custom properties on `body.home-vintage-lock`:

| Token             | Value     | Use                                      |
| ----------------- | --------- | ---------------------------------------- |
| `--home-bg`       | `#f4f4f4` | Page background (paper)                  |
| `--home-surface`  | `#ffffff` | App container surface                    |
| `--home-card-bg`  | `#f8f9fa` | Cards, tiles, inset blocks               |
| `--home-border`   | `#e5e7eb` | Hairlines on cards / dividers            |
| `--home-ink`      | `#111111` | Logo strokes, hover-emphasis ink         |
| `--home-text`     | `#374151` | Body & headings                          |
| `--home-muted`    | `#6b7280` | Captions, footers, "← Home" link         |

Stick to that ramp. New shades or accent colors need an explicit reason.

## Typography

- **`Special Elite`** (Google Fonts) for everything. Fallback: `monospace`.
- Headings (`h1`, `h2`, `h3`) use the same family — weight comes from size, not
  from `font-weight: bold`.
- Letter-spacing on small UI text is typically `0.04em`–`0.12em`.

## The two rings

Every module's manifest declares its `ring`, and the architecture guard
enforces the contract:

- **`circle`** — a soul practice. Acts in place on the home, leaves
  nothing behind, **never navigates** (no `routeHref`). Sukoon has five
  pillars: Sleep, Food, Movement, Mindfulness, and Rooh. Breathe, OM, and
  Focus appear inside Mindfulness. Every pillar leads with its icon-led
  Action layer and places its explanatory Gyaan afterward.
- **`square`** — a purpose tool. Opens its own page (`routeHref`) from a
  corner tile on the home and accumulates a record. Current tools:
  `todo`, `khyaali-bhoot`, `tennis`.

The membership test for anything new: *does using it leave something
behind?* Nothing remains → circle. A record accumulates → square.

## Repository shape

```
src/
  modules/<id>/   everything about one feature: manifest.json (the
                  registry), entry.ts (page entry for square tools),
                  views, data, styles, icon.svg, AGENT.md, __tests__/
  home/           the shell: entry, bootstrap, login gate, user chip,
                  quantum timer widget
  platform/       the foundation: convex client + persistence, auth
                  store/session, timers, store, time
  sdk/            the module contract: storage, timer, events, ui, user,
                  and durable.ts (WAL + SaveController — see Resilience)
  styles/         shared tokens + home lock only; per-module CSS lives in
                  the module and is imported by its entry
  utils/          escapeHtml, date, error handling
```

Layering (machine-checked): `platform/`, `sdk/`, and `utils/` never import
`home/` or `modules/`; modules import only their own folder + the
foundation — never the shell, never each other.

## Adding a square tool

```bash
npm run new:module <id>
```

scaffolds `src/modules/<id>/` + `<id>.html`, then the architecture guard
holds you to three wiring steps: add the id to `EXPECTED_MODULES` in
`scripts/check-architecture.mjs`, add the `<a class="orbit-tool">` tile in
`index.html`, and register the Vite input in `vite.config.ts`.

Every standalone page should:

1. Load the same fonts + `src/styles/index.css` + `home-lock.css` as the home.
2. Set `<body class="home-vintage-lock">` so the design tokens apply.
3. Wrap content in `<div id="app-container" class="app-container <id>-page">`.
4. Open with a quiet `← Home` text link, then `<h1>` + page emoji in
   `<span class="theme-icon">`. No "Back to Dashboard" buttons, no
   subtitles.
5. Be mounted by `src/modules/<id>/entry.ts` (which also imports the
   module's CSS).

## Resilience

Any module that syncs a record to the server must use the SDK's durable
primitives (`src/sdk/durable.ts`), extracted from To Do where each piece
maps to a previously-real data-loss bug:

- a localStorage **WAL** written before every network save, and
- a **SaveController** whose dirty flag is only cleared by a confirmed
  save, with backoff retries that park in an `offline` state.

Ephemeral circle-practice state (like Food's check-offs) stays in memory and
is cleared when the practice closes.

## Icon style

Module icons (`src/modules/<id>/icon.svg`) and all inline orbit glyphs are
**monoline SVG stroke art** — no emoji, no filled shapes:

```
viewBox="0 0 24 24" fill="none" stroke="currentColor"
stroke-linecap="round" stroke-linejoin="round"
```

(stroke-width 2.5 for module icons, 1.9 for orbit glyphs). Keep paths
simple — recognisable silhouettes, 3–5 elements. Emoji belong only in the
page header `<span class="theme-icon">`.

## Home page invariants

- The orbit markup in `index.html` is the source of truth for what's on
  the home. There is no runtime module-arranging code — that's deliberate.
- The five Sukoon pillar hooks (`data-panel="sleep|food|movement|mindfulness|rooh"`),
  the three Mindfulness actions (`data-mode="breathe|om|focus"`), and one
  `href` per square tool must
  exist in the home markup; `npm run check:architecture` fails otherwise.
- The quantum focus timer lives in the header top-right; the contemplation
  verse rests below the orbit.
- `being.html` is a redirect stub to `/` — keep it for old bookmarks and
  the installed PWA.

## Mobile first

The app is a PWA installed to an iOS home screen. Design and verify at
~375×812 first, then desktop. Orbit radii and tiles use relative units;
tap targets ≥ 44px. Never ship a layout verified only at desktop width.

## Things to avoid

- Marketing-style gradients, drop-shadows beyond the existing 1–3px
  hairline shadows, or rounded-pill CTAs.
- Sans-serif body fonts. The whole product reads in Special Elite.
- New full-bleed colors. Page-specific accents belong in the emoji.
- Dashboard chrome: no carousels, no grids of tiles, no in-app module
  editors. The orbit is the navigation.
- React or other frameworks — the app is vanilla TS + HTML by decision.

## Verification

`npm run verify` = type-check, lint, tests, architecture guard, build.
Run it before any commit. CI runs the same.
