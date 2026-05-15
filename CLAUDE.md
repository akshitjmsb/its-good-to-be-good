# It's Good To Be King — design system & conventions

This repo is a personal-life PWA. The home page (`index.html`) is the visual
anchor and design source-of-truth. Every subpage should look and feel like a
quiet sibling of the home — not a separate product.

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
- Letter-spacing on small UI text is typically `0.04em`–`0.12em` (the wider
  spacing is for `dt`-style labels in `UPPERCASE`).

## Page structure

Every standalone subpage should:

1. Load the same fonts + `src/styles/index.css` as the home.
2. Set `<body class="home-vintage-lock">` so the design tokens apply.
3. Wrap content in `<div id="app-container" class="app-container <page>-page">`.
4. Open with a quiet `← Home` text link, then the page header. Example:

   ```html
   <nav class="page-back-nav">
       <a href="index.html" class="home-link">← Home</a>
   </nav>

   <header class="text-center mb-6">
       <div class="flex justify-center items-center">
           <h1>Page Name</h1>
           <span class="theme-icon" aria-hidden="true">🎾</span>
       </div>
   </header>
   ```

   No big "Back to Dashboard" button. No subtitle by default — the page name
   plus its emoji are enough. A subtitle is only justified when the page name
   alone is genuinely ambiguous, and even then it goes in `.text-xs`.

5. Register a Vite entry in `vite.config.ts` so the page is built.

## Module types

The home surfaces two kinds of modules, defined in
`src/domains/modules/registry.data.js`:

- **Journey** (`category: 'journey'`) — full pages reached via the horizontal
  `.nav-carousel` near the top. Each is its own `*.html` + `src/pages/*.ts`
  pair (e.g. `tennis.html` + `src/pages/tennis.ts`). Use for sustained,
  long-running practices that get their own canvas.

- **Learn** (`category: 'learn'`) — tiles in the `.category-grid` lower on the
  home page. Most open as modals (`surface: 'modal'`) over the home; a few
  are full pages (`surface: 'page'`, e.g. French). Use for short
  read-or-poke interactions that don't need their own page.

To add a module:

1. Add an entry to `MODULE_REGISTRY_DATA` with `id`, `displayName`,
   `category`, `surface`, `entrySelector`, `handlerName`, `ownerPath`,
   `iconElementId`, `dataModule`, plus `routeHref` (page) or `modalId`
   (modal).
2. Add the corresponding tile in `index.html` with the matching `data-module`
   attribute.
3. Add the icon SVG in `src/utils/iconRenderer.ts` under the right map.
4. For a journey page, add the HTML file + `src/pages/<id>.ts` runtime
   marker, and register the entry in `vite.config.ts`.
5. Update the registry test (`src/domains/modules/__tests__/registry.test.ts`)
   so the expected ID set stays exact.

## Home page layout invariants

- Carousel order in `index.html` is the source of truth. To reorder the
  Journey carousel or the Learn grid, edit the markup directly — there's
  no runtime reorder UI.
- The Quantum carousel slot is `hidden` in markup because the timer widget
  lives in the top-right of the header. Keep the slot — removing `hidden`
  re-surfaces it.
- `.nav-item[hidden]` must stay `display: none`. The `[hidden]` UA rule
  loses to `.nav-item { display: flex }` without the explicit override.

## Icon style

All module icons in `src/utils/iconRenderer.ts` must be **monoline SVG
stroke art** — no emoji, no filled shapes. Every icon follows the same
template:

```
width="24" height="24" viewBox="0 0 24 24"
fill="none" stroke="currentColor" stroke-width="2.5"
stroke-linecap="round" stroke-linejoin="round"
```

Keep paths simple (3–5 elements max). The icons render at nav-tile size
so fine detail is lost — aim for recognisable silhouettes. Never use
emoji as module icons in the carousel or grid; emoji belong only in the
page header `<span class="theme-icon">`.

## Things to avoid

- Marketing-style gradients, drop-shadows beyond the existing 1–3px hairline
  shadows on cards, or rounded-pill CTAs.
- Sans-serif body fonts. The whole product reads in Special Elite.
- New full-bleed colors. Page-specific accents belong in the emoji.
- Heavy-weight chrome buttons for navigation back to home — use `.home-link`.
