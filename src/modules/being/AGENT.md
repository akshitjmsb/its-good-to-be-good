# Being module

- **id:** `being`
- **ring:** circle (soul — acts in place on the home, never navigates)
- **renderer:** dom
- **permissions:** timer, storage

## Purpose

Being IS the home page's resting state: the Vitruvian Man at the centre
with five Sukoon pillars riding the circle —

- **Centre reset** — tapping the Vitruvian Man immediately starts a continuous
  4-second inhale / 6-second exhale guide with the existing OM loop at quiet
  volume. It continues through screen lock; a second tap stops it and it
  retains nothing.

- **Sleep** — one contextual light action. From 5:00–17:59, Outside starts a
  session-only ten-minute timer. From 18:00–4:59, Dim temporarily warms and
  lowers the app until Sleep closes. Neither action leaves a record.
- **Food** — a session-only next-meal cue rendered by the shell from the Food
  module, keeping the module boundary intact.
- **Movement** — Stretch Now opens one deterministic curated stretch for the
  local day. The full Stretch chooser and three deterministic, fully-offline
  Weights pointers remain secondary paths.
- **Mindfulness** — Breathe, OM, and Focus. Breathe begins immediately with a
  continuous 4-in / 6-out audio guide that survives screen lock and stops from
  the Vitruvian Man. Focus begins immediately from one of four fixed choices:
  5, 10, 15, or 30 minutes.
  Audio uses HTMLAudioElement for iOS autoplay reliability.
- **Rooh** — relationships, safety, and co-regulation.

Every pillar panel contains only its approved icon-led action pointers. Do
not add teaching or supporting prose without explicit Product Owner approval.

## Files

- `manifest.json` — module metadata (ring: circle, so no routeHref).
- `orbit.ts` — `initBeingOrbit()`: orbit icon wiring, the activity stage,
  practice panels. Mounted by `src/home/bootstrap.ts`.
- `sleep.ts` / `sleep.css` — contextual Sleep action and temporary dim state.
- `meditate.ts` — `initMeditate()`: timer + breath ring + ambient audio.
- `exercise-view.ts` — today's three Weights pointers.
- `exercise-data.ts` — schedule + pools, deterministic and offline.
- `exercise.css` — Weights panel styles (imported by orbit.ts).
- `icon.svg` — module icon (monoline lotus).
- `__tests__/` — exercise-data coverage.

## Notes

`being.html` is a redirect stub to `/` kept for old bookmarks and the
installed PWA.
