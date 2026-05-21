# French module

- **id:** `french`
- **category:** learn
- **surface:** page (`french.html`)
- **renderer:** react (the underlying app is React)
- **permissions:** none

## Purpose

A French translator practice app. The actual React app lives at
`src/apps/french-translator/main.tsx` with its own Vite entry —
this module is a thin home-side handle that navigates the user there.

## Files

- `manifest.json` — module metadata.
- `controller.ts` — `init` calls `navigateToFrenchPage()` which sets
  `window.location.href = 'french.html'`.
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

## Back-compat

`modalManager.ts` has its own inline `navigateToFrenchPage` for the
legacy mapping; it can switch to this module once the v2 lifecycle
takes over routing.

## Guardrails

- `navigateToFrenchPage` no-ops when `window` is undefined so the test
  runner doesn't blow up.
