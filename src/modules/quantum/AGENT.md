# Quantum module

- **id:** `quantum`
- **category:** journey
- **surface:** page (`quantum.html`)
- **renderer:** dom
- **permissions:** timer, storage

## Purpose

A focus-sprint timer with cross-tab sync. The header on `index.html`
shows the running session live; the full page UI lives at `quantum.html`.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — navigation handle. The page entry remains at
  `src/pages/quantum.ts` (Vite entry for `quantum.html`).
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

## Back-compat

`navigateQuantumPage` is the same name the registry used pre-migration.
