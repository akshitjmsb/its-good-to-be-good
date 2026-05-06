# Audio credits

## om.mp3 — vocal OM chant loop

Source: [`youtu.be/SBiwLibZqfw`](https://youtu.be/SBiwLibZqfw) — a 3-hour OM meditation chant on YouTube. The user explicitly authorized downloading after weighing the trade-offs; only a 5-minute section is extracted, and the file is served from this personal-dashboard's own audio directory rather than re-uploaded anywhere public-facing.

Acquisition + processing (via `yt-dlp` and `ffmpeg`):
- `yt-dlp --download-sections "*10:00-15:00" --force-keyframes-at-cuts -x --audio-format wav` to grab only the middle 5 minutes (skips intro + outro). Source stream from YouTube is Opus 48 kHz stereo 96 kbps; the WAV is its lossless container.
- Built a seamless ~5-minute loop (297 s) via a 3 s self-crossfade — the last 3 s of the section is cross-faded with its first 3 s, so the clip's end matches its start when looped. Head and tail RMS levels both around -19 to -22 dB, no perceptible discontinuity at the seam.
- Kept stereo, encoded at 320 kbps to preserve the source quality (~11.3 MB).

## sleep-music.mp3 — sleep / sleep-music ambient loop

Source: [`youtu.be/yQvYvMp4JHU`](https://youtu.be/yQvYvMp4JHU) — long-form ambient track on YouTube, same authorization context as above. 5-minute section (t = 5:00 → 10:00) extracted to skip any intro and land on the steady-state body of the track.

Acquisition + processing identical to `om.mp3`:
- `yt-dlp --download-sections "*5:00-10:00" --force-keyframes-at-cuts -x --audio-format wav`. Source is Opus 48 kHz stereo; the WAV is its lossless container.
- Seamless 297 s loop via a 3 s self-crossfade. White-noise-style content is statistically uniform so the seam is imperceptible regardless, but the crossfade is applied for consistency with `om.mp3`.
- Stereo 320 kbps MP3 at 48 kHz, ~11.3 MB.

(Replaced the previous in-repo synthesized `whitenoise.mp3` — `ffmpeg`'s `anoisesrc=color=white` through a 6 kHz low-pass — when the tile was renamed from "White noise" to "Sleep music".)

## chime-{high,mid,low}.mp3 — breath-phase bell tones

Synthesized in-repo via `ffmpeg`'s `aevalsrc` filter — fundamental sine + 2× harmonic at 30 % gain, exponential decay (`exp(-5t)`), 5 ms attack fade to suppress the transient click at t=0. Mono, 96 kbps, ~8 KB each.

| File | Fundamental | Harmonic | Use |
| --- | --- | --- | --- |
| `chime-high.mp3` | 880 Hz (A5) | 1760 Hz | inhale phase + session-end |
| `chime-mid.mp3`  | 660 Hz (E5) | 1320 Hz | hold phases |
| `chime-low.mp3`  | 440 Hz (A4) | 880 Hz  | exhale phase |
