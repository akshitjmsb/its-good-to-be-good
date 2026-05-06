# Audio credits

## om.mp3 — vocal OM chant loop

Source: ["Ohm of Creation"](https://freesound.org/people/BaDoink/sounds/565834/) by **BaDoink** on Freesound.

License: **Creative Commons 0 (Public Domain)** — no attribution required, but credited here as a courtesy.

Processing applied (via `ffmpeg`):
- Trimmed to a 32-second working clip starting at `t = 10s` (skips fade-in, lands on the level-stable middle region around −22 dB RMS)
- Built a seamless 30-second loop via a 2-second self-crossfade (the last 2s of the source segment is cross-faded with the first 2s, so the clip's end matches its start when looped)
- Downmixed to mono and re-encoded at 96 kbps to keep the bundle small (~360 KB)

## chime-{high,mid,low}.mp3 — breath-phase bell tones

Synthesized in-repo via `ffmpeg`'s `aevalsrc` filter — fundamental sine + 2× harmonic at 30 % gain, exponential decay (`exp(-5t)`), 5 ms attack fade to suppress the transient click at t=0. Mono, 96 kbps, ~8 KB each.

| File | Fundamental | Harmonic | Use |
| --- | --- | --- | --- |
| `chime-high.mp3` | 880 Hz (A5) | 1760 Hz | inhale phase + session-end |
| `chime-mid.mp3`  | 660 Hz (E5) | 1320 Hz | hold phases |
| `chime-low.mp3`  | 440 Hz (A4) | 880 Hz  | exhale phase |

## whitenoise.mp3 — soft white-noise loop

Synthesized in-repo via `ffmpeg`'s `anoisesrc=color=white` source through a 6 kHz low-pass for a softer "shh" character, with 50 ms in/out fades to mask the loop seam. 30 s mono 96 kbps, ~360 KB.
