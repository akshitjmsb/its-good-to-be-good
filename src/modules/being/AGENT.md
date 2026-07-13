# Being module

- **id:** `being`
- **ring:** circle (soul — acts in place on the home, never navigates)
- **renderer:** dom
- **permissions:** timer, storage

## Purpose

Being IS the home page's resting state: the Vitruvian Man at the centre
with the five soul practices riding the circle —

- **Breathe / OM / Sleep** — meditation timer with optional 4-4-4-4
  box-breathing chimes, an OM loop, and a sleep-music loop (HTMLAudioElement
  for iOS autoplay reasons).
- **Stretch** — YouTube routine links, flattened from body-part pools.
- **Weights** — deterministic, fully-offline PPL + Upper schedule with a
  month calendar and compact exercise cards.

## Files

- `manifest.json` — module metadata (ring: circle, so no routeHref).
- `orbit.ts` — `initBeingOrbit()`: orbit icon wiring, the activity stage,
  practice panels. Mounted by `src/home/bootstrap.ts`.
- `meditate.ts` — `initMeditate()`: timer + breath ring + ambient audio.
- `exercise-view.ts` — Weights panel renderer (calendar + cards).
- `exercise-data.ts` — schedule + pools, deterministic and offline.
- `exercise.css` — Weights panel styles (imported by orbit.ts).
- `icon.svg` — module icon (monoline lotus).
- `__tests__/` — exercise-data coverage.

## Notes

`being.html` is a redirect stub to `/` kept for old bookmarks and the
installed PWA.
