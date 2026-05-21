# Guitar ("Mr. Mojo Rising") module

- **id:** `guitar`
- **category:** learn
- **surface:** external
- **renderer:** dom
- **permissions:** none

## Purpose

Opens the standalone Mr. Mojo Rising web app in a new tab. There is no
in-app surface — this is purely a navigation handle.

## Files

- `manifest.json` — module metadata, includes `externalUrl`.
- `controller.ts` — `init` opens the URL; `destroy` is a no-op.
  Exposes `openMrMojoRising()` for the legacy modalManager wiring.
- `icon.svg` — module icon.
- `__tests__/` — controller surface coverage.

## Back-compat

`modalManager.ts` defines an inline `openMrMojoRising` for the legacy
handler. Once it switches to v2 lifecycle the legacy function will
be sourced directly from this module.

## Guardrails

- `window.open` is invoked with `'noopener,noreferrer'` so the new tab
  cannot reach back through `window.opener`.
