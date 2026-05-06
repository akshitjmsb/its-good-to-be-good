/**
 * Standalone ambient sound tiles for the meditation page (OM, white
 * noise). Each tile owns a play/stop button, volume slider, and an
 * optional auto-stop timer. Voices share the process-wide AudioContext
 * so multiple tiles can play simultaneously without spinning up
 * extra audio engines.
 *
 * The voice lifecycle is simple: factories build a voice on first
 * play, the voice exposes start/stop/setVolume, and stop() schedules
 * an exponential fade so transitions never click.
 */

import { getSharedAudioContext } from '../core/sharedAudioContext';

export interface AmbientVoice {
  start(): void;
  stop(): void;
  setVolume(value: number): void;
  isPlaying(): boolean;
  dispose(): void;
}

export type VoiceFactory = (ctx: AudioContext) => AmbientVoice;

const TIMER_OPTIONS = [0, 5, 10, 20] as const;

// ─────────────────────────────────────────────────────────────────────
// OM voice — looped recording of a real OM chant via HTMLAudioElement.
//
// Why HTMLAudioElement and not Web Audio? On iOS Safari, the user-
// gesture rule is strict: audio playback must be initiated *inside*
// the same synchronous call stack as the tap. The Web Audio path
// (fetch → decodeAudioData → bufferSource.start) hops through async
// boundaries, so by the time start() runs the gesture is gone and
// iOS keeps the engine silent — exactly the symptom we hit. Calling
// audio.play() synchronously on tap is the reliable iOS path.
//
// The element is constructed once per voice and reused across
// start/stop. Loop is built-in via element.loop = true, so the seamless
// 30 s loop in the source file does the work.

export function createOmVoice(audioUrl: string): VoiceFactory {
  return () => {
    let audio: HTMLAudioElement | null = null;
    let userGain = 0.6;

    function ensureAudio(): HTMLAudioElement {
      if (audio) return audio;
      const el = new Audio(audioUrl);
      el.loop = true;
      el.preload = 'auto';
      el.volume = userGain;
      el.addEventListener('error', () => {
        console.warn(
          '[om-audio] error code',
          el.error?.code,
          el.error?.message
        );
      });
      audio = el;
      return el;
    }

    function start(): void {
      const el = ensureAudio();
      el.volume = userGain;
      // Critical for iOS Safari: play() must be invoked synchronously
      // inside the click handler that called us. The rest of this
      // function is sync up to here, so we're still on the gesture
      // stack.
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(error => {
          console.warn('[om-audio] play rejected:', error);
        });
      }
    }

    function stop(): void {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    }

    function setVolume(value: number): void {
      userGain = Math.max(0, Math.min(1, value));
      if (audio) audio.volume = userGain;
    }

    function isPlaying(): boolean {
      return audio !== null && !audio.paused;
    }

    function dispose(): void {
      stop();
      if (audio) {
        audio.removeAttribute('src');
        audio.load();
        audio = null;
      }
    }

    return { start, stop, setVolume, isPlaying, dispose };
  };
}

// ─────────────────────────────────────────────────────────────────────
// Noise voice — looped 2 s white-noise buffer through a 6 kHz low-pass
// for a gentler "shhh" character vs. raw bright hiss.

let cachedNoiseBuffer: AudioBuffer | null = null;

export const createNoiseVoice: VoiceFactory = ctx => {
  const PEAK = 0.1;
  const FADE_S = 0.4;
  const LP_HZ = 6_000;

  let nodes: {
    master: GainNode;
    source: AudioBufferSourceNode;
  } | null = null;
  let userGain = 0.5;

  const intrinsicPeak = (): number => Math.max(0.0001, PEAK * userGain);

  function getBuffer(): AudioBuffer {
    if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
      return cachedNoiseBuffer;
    }
    const seconds = 2;
    const buffer = ctx.createBuffer(
      1,
      ctx.sampleRate * seconds,
      ctx.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    cachedNoiseBuffer = buffer;
    return buffer;
  }

  function start(): void {
    if (nodes) return;
    if (ctx.state === 'suspended') void ctx.resume();
    try {
      const now = ctx.currentTime;

      const source = ctx.createBufferSource();
      source.buffer = getBuffer();
      source.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = LP_HZ;
      lp.Q.value = 0.707;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(intrinsicPeak(), now + FADE_S);

      source.connect(lp);
      lp.connect(master);
      master.connect(ctx.destination);
      source.start(now);

      nodes = { master, source };
    } catch (error) {
      console.warn('Could not start noise voice:', error);
    }
  }

  function stop(): void {
    if (!nodes) return;
    const refs = nodes;
    nodes = null;
    try {
      const now = ctx.currentTime;
      refs.master.gain.cancelScheduledValues(now);
      refs.master.gain.setValueAtTime(refs.master.gain.value, now);
      refs.master.gain.exponentialRampToValueAtTime(0.0001, now + FADE_S);
      try {
        refs.source.stop(now + FADE_S + 0.05);
      } catch {
        /* already stopped */
      }
    } catch (error) {
      console.warn('Could not stop noise voice:', error);
    }
  }

  function setVolume(value: number): void {
    userGain = Math.max(0, Math.min(1, value));
    if (!nodes) return;
    try {
      const now = ctx.currentTime;
      nodes.master.gain.cancelScheduledValues(now);
      nodes.master.gain.setValueAtTime(nodes.master.gain.value, now);
      nodes.master.gain.linearRampToValueAtTime(intrinsicPeak(), now + 0.1);
    } catch (error) {
      console.warn('Could not set noise volume:', error);
    }
  }

  function isPlaying(): boolean {
    return nodes !== null;
  }

  function dispose(): void {
    stop();
  }

  return { start, stop, setVolume, isPlaying, dispose };
};

// ─────────────────────────────────────────────────────────────────────
// Tile widget — wires play/stop, volume slider, optional auto-stop
// timer, and a remaining-time readout. Persists volume + timer choice
// in localStorage under `${storagePrefix}.{volume,timer}`.

export interface AmbientTileOptions {
  factory: VoiceFactory;
  storagePrefix: string;
  defaultVolume?: number;
}

export interface AmbientTileHandle {
  dispose(): void;
}

function readPersistedNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function persistNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* localStorage unavailable */
  }
}

export function setupAmbientTile(
  root: HTMLElement,
  options: AmbientTileOptions
): AmbientTileHandle {
  const playBtn = root.querySelector<HTMLButtonElement>(
    '[data-action="toggle"]'
  );
  const volumeInput = root.querySelector<HTMLInputElement>(
    '[data-control="volume"]'
  );
  const timerButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-timer]')
  );
  const remainingDisplay = root.querySelector<HTMLElement>(
    '[data-display="remaining"]'
  );

  if (!playBtn) return { dispose() {} };

  const VOLUME_KEY = `${options.storagePrefix}.volume`;
  const TIMER_KEY = `${options.storagePrefix}.timer`;
  const defaultVolume = options.defaultVolume ?? 0.6;

  let voice: AmbientVoice | null = null;
  let timerMin = 0;
  let endsAt: number | null = null;
  let countdownId: number | null = null;

  let volume = Math.max(0, Math.min(1, readPersistedNumber(VOLUME_KEY, defaultVolume)));
  const persistedTimer = readPersistedNumber(TIMER_KEY, 0);
  if ((TIMER_OPTIONS as readonly number[]).includes(persistedTimer)) {
    timerMin = persistedTimer;
  }

  function syncVolumeUI(): void {
    if (!volumeInput) return;
    const pct = Math.round(volume * 100);
    volumeInput.value = String(pct);
    volumeInput.style.setProperty('--progress', `${pct}%`);
  }

  function syncPlayUI(): void {
    const playing = !!voice?.isPlaying();
    if (playBtn) {
      playBtn.textContent = playing ? 'Stop' : 'Play';
      playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }
    root.classList.toggle('is-playing', playing);
  }

  function syncTimerUI(): void {
    timerButtons.forEach(btn => {
      const min = Number(btn.dataset.timer ?? -1);
      btn.setAttribute('aria-pressed', min === timerMin ? 'true' : 'false');
    });
  }

  function syncRemainingUI(): void {
    if (!remainingDisplay) return;
    if (!endsAt || !voice?.isPlaying()) {
      remainingDisplay.textContent = '';
      return;
    }
    const remainingMs = Math.max(0, endsAt - Date.now());
    const totalSec = Math.ceil(remainingMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = String(totalSec % 60).padStart(2, '0');
    remainingDisplay.textContent = `${m}:${s} left`;
  }

  function clearCountdown(): void {
    if (countdownId !== null) {
      window.clearInterval(countdownId);
      countdownId = null;
    }
    endsAt = null;
  }

  function scheduleAutoStop(): void {
    clearCountdown();
    if (timerMin <= 0) return;
    endsAt = Date.now() + timerMin * 60 * 1000;
    countdownId = window.setInterval(() => {
      if (!endsAt) return;
      if (Date.now() >= endsAt) {
        stop();
      } else {
        syncRemainingUI();
      }
    }, 1_000);
  }

  function start(): void {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (voice?.isPlaying()) return;
    if (!voice) voice = options.factory(ctx);
    voice.setVolume(volume);
    voice.start();
    scheduleAutoStop();
    syncPlayUI();
    syncRemainingUI();
  }

  function stop(): void {
    voice?.stop();
    clearCountdown();
    syncPlayUI();
    syncRemainingUI();
  }

  playBtn.addEventListener('click', () => {
    if (voice?.isPlaying()) stop();
    else start();
  });

  volumeInput?.addEventListener('input', () => {
    const parsed = Number(volumeInput.value) / 100;
    if (!Number.isFinite(parsed)) return;
    volume = Math.max(0, Math.min(1, parsed));
    persistNumber(VOLUME_KEY, volume);
    voice?.setVolume(volume);
    volumeInput.style.setProperty(
      '--progress',
      `${Math.round(volume * 100)}%`
    );
  });

  timerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const min = Number(btn.dataset.timer ?? -1);
      if (!(TIMER_OPTIONS as readonly number[]).includes(min)) return;
      timerMin = min;
      persistNumber(TIMER_KEY, timerMin);
      syncTimerUI();
      if (voice?.isPlaying()) {
        scheduleAutoStop();
        syncRemainingUI();
      }
    });
  });

  syncVolumeUI();
  syncPlayUI();
  syncTimerUI();
  syncRemainingUI();

  return {
    dispose() {
      stop();
      voice?.dispose();
      voice = null;
    },
  };
}
