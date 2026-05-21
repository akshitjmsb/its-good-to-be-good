# Money module

- **id:** `money`
- **category:** journey
- **surface:** page (`money.html`)
- **renderer:** dom
- **permissions:** storage, cache

## Purpose

Personal finance journal — net-worth tracking, ledger entries, and the
running rolling view. Full page; the module is a home-side navigation
handle.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — navigation handle. Page entry at
  `src/pages/money.ts` (Vite entry for `money.html`).
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

## Back-compat

`navigateMoneyPage` is the same name the registry used pre-migration.
