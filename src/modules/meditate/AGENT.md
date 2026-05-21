# Meditate module

- **id:** `meditate`
- **category:** journey
- **surface:** page (`meditate.html`)
- **renderer:** dom
- **permissions:** timer, storage

## Purpose

Sit-and-breathe timer with optional 4-4-4-4 box-breathing chimes, an OM
loop, and a sleep-music loop. The page entry script handles all the iOS
audio-unlock subtleties; this module owns the manifest + navigation handle.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — navigation handle. Page entry at
  `src/pages/meditate.ts` (Vite entry for `meditate.html`).
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

## Back-compat

`navigateMeditatePage` is the same name the registry used pre-migration.
