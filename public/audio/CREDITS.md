# Audio credits

## om.mp3 — vocal OM chant loop

Source: ["Om Namah Shivay Chanting by Martina Motwani"](https://pixabay.com/music/meditationspiritual-om-namah-shivay-chanting-by-martina-motwani-373456/) on Pixabay.

License: **Pixabay Content License** — free for commercial use, no attribution legally required, but credited here as a courtesy. Original recording is Content ID Registered to martinamotwani.

The source is 7:13 of professionally recorded Om Namah Shivay chanting at stereo 48 kHz / 256 kbps with rock-solid level consistency (-15 to -17 dB RMS throughout).

Processing applied (via `ffmpeg`):
- Trimmed a 53-second working clip starting at `t = 30 s` of the source (well into the level-stable middle).
- Built a seamless 50-second loop via a 3-second self-crossfade — the last 3 s of the working clip is cross-faded with the first 3 s, so the clip's end matches its start when looped (verified: seam RMS levels match within 1 dB on both channels).
- Kept stereo, encoded at 256 kbps to preserve studio quality (~1.6 MB).

## chime-{high,mid,low}.mp3 — breath-phase bell tones

Synthesized in-repo via `ffmpeg`'s `aevalsrc` filter — fundamental sine + 2× harmonic at 30 % gain, exponential decay (`exp(-5t)`), 5 ms attack fade to suppress the transient click at t=0. Mono, 96 kbps, ~8 KB each.

| File | Fundamental | Harmonic | Use |
| --- | --- | --- | --- |
| `chime-high.mp3` | 880 Hz (A5) | 1760 Hz | inhale phase + session-end |
| `chime-mid.mp3`  | 660 Hz (E5) | 1320 Hz | hold phases |
| `chime-low.mp3`  | 440 Hz (A4) | 880 Hz  | exhale phase |

## whitenoise.mp3 — soft white-noise loop

Synthesized in-repo via `ffmpeg`'s `anoisesrc=color=white` source through a 6 kHz low-pass for a softer "shh" character, with 50 ms in/out fades to mask the loop seam. 30 s mono 96 kbps, ~360 KB.
