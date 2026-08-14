# Being module

- **id:** `being`
- **ring:** circle (soul — acts in place on the home, never navigates)
- **renderer:** dom
- **permissions:** timer, storage

## Purpose

Being IS the home page's resting state: the Vitruvian Man at the centre
with five Sukoon pillars riding the circle —

- **Sleep** — the master pillar, including circadian/light guidance.
- **Food** — a session-only next-meal cue rendered by the shell from the Food
  module, keeping the module boundary intact.
- **Movement** — Stretch links plus the deterministic, fully-offline Weights
  calendar.
- **Mindfulness** — body-budget guidance containing Breathe, OM, and Focus.
  Audio uses HTMLAudioElement for iOS autoplay reliability.
- **Rooh** — relationships, safety, and co-regulation.

Every pillar panel follows the same hierarchy: an icon-led **Action** layer
first, followed by supporting guidance. Do not put teaching copy ahead of the
immediate practice.

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
