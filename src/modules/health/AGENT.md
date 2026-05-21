# Health module

- **id:** `health`
- **category:** journey
- **surface:** page (`health.html`)
- **renderer:** dom
- **permissions:** none yet

## Purpose

Health journal — pulse, weight, sleep notes. Currently the page is a
shell; this module owns the manifest and the home-side navigation handle.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — navigation handle. Page entry at
  `src/pages/health.ts` (Vite entry for `health.html`).
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.
