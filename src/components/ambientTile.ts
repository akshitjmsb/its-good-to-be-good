/**
 * Standalone ambient sound tiles for the meditation page (OM, white
 * noise). Each tile owns a play/stop button, volume slider, and an
 * optional auto-stop timer.
 *
 * Both voices use HTMLAudioElement rather than Web Audio. iOS Safari's
 * autoplay policy is strict in two ways that combine to make Web Audio
 * unreliable here: (1) AudioContext.resume() must land synchronously
 * inside the user-gesture call stack, and (2) any async hop (fetch,
 * decodeAudioData) before the first AudioBufferSource.start() drops the
 * gesture context and the engine stays silent. HTMLAudioElement.play()
 * called synchronously inside the click handler is the reliable iOS
 * path — the browser handles streaming + buffering for us.
 */

const TIMER_OPTIONS = [0, 5, 10, 20] as const;

export interface AmbientVoice {
  start(): void;
  stop(): void;
  setVolume(value: number): void;
  isPlaying(): boolean;
  dispose(): void;
}

export type VoiceFactory = () => AmbientVoice;

/**
 * Build a voice that plays a single audio file on loop. The element
 * is constructed lazily on first start() and reused — no fetch/decode
 * round trip, no AudioContext, no gesture-loss across async hops.
 */
export function createAudioFileVoice(audioUrl: string): VoiceFactory {
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
          `[ambient] ${audioUrl} error code=${el.error?.code} msg=${el.error?.message ?? ''}`
        );
      });
      audio = el;
      return el;
    }

    function start(): void {
      const el = ensureAudio();
      el.volume = userGain;
      // Critical for iOS Safari: play() must be invoked synchronously
      // inside the click handler that called us.
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(error => {
          console.warn(`[ambient] play rejected (${audioUrl}):`, error);
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

// Aliases — both voices are file-backed, but the call sites read more
// clearly with named factory builders.
export const createOmVoice = createAudioFileVoice;
export const createNoiseVoice = createAudioFileVoice;

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

  let volume = Math.max(
    0,
    Math.min(1, readPersistedNumber(VOLUME_KEY, defaultVolume))
  );
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
    if (voice?.isPlaying()) return;
    if (!voice) voice = options.factory();
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
