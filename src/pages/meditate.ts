/**
 * Meditate page — view layer over the shared countdown core.
 *
 * The timer + persistence + cross-tab sync live in
 * `src/core/countdownTimer.ts` (consumed via `getMeditateTimer()`).
 * This file owns the meditation-specific UI: chime on completion,
 * breath-ring guidance during running sessions, preset duration row,
 * stats panel, and the standalone OM + white-noise ambient tiles.
 *
 * All audio uses HTMLAudioElement, not Web Audio. iOS Safari's
 * autoplay policy is too strict for the Web Audio path to be reliable
 * — see the note in src/components/ambientTile.ts.
 */

import {
  type CountdownSession,
  type CountdownState,
  currentStreak,
  formatCountdownTime,
  totalMinutes,
} from '../core/countdownTimer';
import { getMeditateTimer } from '../core/meditateTimer';
import {
  type AmbientTileHandle,
  createNoiseVoice,
  createOmVoice,
  setupAmbientTile,
} from '../components/ambientTile';

const PRESET_MINUTES = [5, 10, 20] as const;
const STATUS_RUNNING = 'Stay with the breath.';
const STATUS_COMPLETE = 'Session complete.';
const idleStatus = (mins: number) => `${mins} minute session`;

// 4-4-4-4 box breathing — anchor chime per phase. Inhale rides high
// (A5), exhale drops a full octave (A4) to signal release; the two
// holds share a neutral mid pitch (E5).
type ChimePitch = 'high' | 'mid' | 'low';
const PHASE_CHIMES: readonly ChimePitch[] = ['high', 'mid', 'low', 'mid'];
const CHIME_URLS: Record<ChimePitch, string> = {
  high: '/audio/chime-high.mp3',
  mid: '/audio/chime-mid.mp3',
  low: '/audio/chime-low.mp3',
};
const PHASE_MS = 4_000;

const SOUND_MODE_KEY = 'meditate.soundMode';
const LEGACY_SOUND_KEY = 'meditate.soundEnabled';
type SoundMode = 'bell' | 'off';
const SOUND_MODES: readonly SoundMode[] = ['bell', 'off'];

document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('meditate-display');
  const button = document.getElementById(
    'meditate-toggle'
  ) as HTMLButtonElement | null;
  const soundModeButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.meditate-sound-mode')
  );
  const status = document.getElementById('meditate-status');
  const breath = document.getElementById('meditate-breath');
  const history = document.getElementById('meditate-history');
  const statWeek = document.getElementById('meditate-stat-week');
  const statStreak = document.getElementById('meditate-stat-streak');
  const statTotal = document.getElementById('meditate-stat-total');
  const presets = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.meditate-preset')
  );
  const omTileEl = document.getElementById('meditate-om-tile');
  const noiseTileEl = document.getElementById('meditate-noise-tile');
  if (!display || !button) return;

  const timer = getMeditateTimer();

  let lastChimedFor: string | null = null; // history[0]?.completedAt
  let breathChimeInterval: number | null = null;
  let breathPhase = 0;
  let breathChimesActive = false;

  // ─────────────────────────────────────────────────────────────────
  // Chime pool — three HTMLAudioElement instances, one per pitch.
  // iOS requires each element to be "unlocked" by being .play()ed
  // inside a user gesture before subsequent programmatic plays work.
  // We unlock them silently on the Start tap.

  const chimeAudios: Record<ChimePitch, HTMLAudioElement> = {
    high: makeChime(CHIME_URLS.high),
    mid: makeChime(CHIME_URLS.mid),
    low: makeChime(CHIME_URLS.low),
  };
  let chimesUnlocked = false;

  function makeChime(url: string): HTMLAudioElement {
    const a = new Audio(url);
    a.preload = 'auto';
    a.addEventListener('error', () => {
      console.warn(
        `[chime] ${url} error code=${a.error?.code} msg=${a.error?.message ?? ''}`
      );
    });
    return a;
  }

  /**
   * Play each chime element silently to satisfy iOS Safari's
   * "must-be-played-during-a-gesture" rule. Everything happens
   * synchronously inside the click handler so we don't race the
   * breath-cycle's first chime that fires immediately after start.
   *
   * play() schedules playback and returns a promise; we pause()
   * before that promise resolves, so the promise rejects with
   * AbortError (which we ignore). iOS still counts the play() call
   * as a user-gesture-initiated play and "primes" the element for
   * later off-gesture plays.
   */
  function unlockChimes(): void {
    if (chimesUnlocked) return;
    chimesUnlocked = true;
    (Object.values(chimeAudios) as HTMLAudioElement[]).forEach(a => {
      a.muted = true;
      const p = a.play();
      a.pause();
      a.currentTime = 0;
      a.muted = false;
      if (p && typeof p.catch === 'function') {
        // Expected: AbortError from pause() arriving before play resolves.
        p.catch(() => {});
      }
    });
  }

  function playChime(pitch: ChimePitch): void {
    if (soundMode !== 'bell') return;
    const a = chimeAudios[pitch];
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch(error => {
          console.warn(`[chime] ${pitch} play rejected:`, error);
        });
      }
    } catch (error) {
      console.warn('[chime] play threw:', error);
    }
  }

  let soundMode: SoundMode = 'bell';
  try {
    const stored = localStorage.getItem(SOUND_MODE_KEY);
    if (stored && (SOUND_MODES as readonly string[]).includes(stored)) {
      soundMode = stored as SoundMode;
    } else {
      const legacyMode = stored;
      const legacyBool = localStorage.getItem(LEGACY_SOUND_KEY);
      if (legacyMode === 'off' || legacyBool === 'false') soundMode = 'off';
      localStorage.setItem(SOUND_MODE_KEY, soundMode);
      if (legacyBool !== null) localStorage.removeItem(LEGACY_SOUND_KEY);
    }
  } catch {
    // localStorage may be unavailable (private mode); default stays bell.
  }

  function durationMin(state: CountdownState): number {
    return Math.round(state.durationMs / 60_000);
  }

  function setStatus(text: string): void {
    if (status) status.textContent = text;
  }

  function startBreathChimes(): void {
    if (breathChimesActive) return;
    if (soundMode !== 'bell') return;
    breathChimesActive = true;
    breathPhase = 0;
    playChime(PHASE_CHIMES[0]);
    breathChimeInterval = window.setInterval(() => {
      breathPhase = (breathPhase + 1) % PHASE_CHIMES.length;
      playChime(PHASE_CHIMES[breathPhase]);
    }, PHASE_MS);
  }

  function stopBreathChimes(): void {
    breathChimesActive = false;
    breathPhase = 0;
    if (breathChimeInterval !== null) {
      window.clearInterval(breathChimeInterval);
      breathChimeInterval = null;
    }
  }

  function renderHistory(history$: CountdownSession[]): void {
    if (!history) return;
    if (history$.length === 0) {
      history.innerHTML = `<p class="meditate-history__empty">No sessions yet.</p>`;
      return;
    }
    history.innerHTML = history$
      .map(s => {
        const minutes = Math.round(s.durationMs / 60_000);
        const when = new Date(s.completedAt).toLocaleString('en-CA', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        return `
          <div class="meditate-history__entry">
            <span class="meditate-history__label">${minutes} min</span>
            <time class="meditate-history__time">${when}</time>
          </div>
        `;
      })
      .join('');
  }

  function renderStats(history$: CountdownSession[]): void {
    if (statWeek) statWeek.textContent = String(history$.length);
    if (statStreak) statStreak.textContent = String(currentStreak(history$));
    if (statTotal) statTotal.textContent = String(totalMinutes(history$));
  }

  function renderPresets(state: CountdownState): void {
    const isActive = state.status === 'running' || state.status === 'break';
    presets.forEach(preset => {
      const min = Number(preset.dataset.duration);
      preset.disabled = isActive;
      preset.setAttribute(
        'aria-pressed',
        !isActive && min === durationMin(state) ? 'true' : 'false'
      );
    });
  }

  function setBreathActive(active: boolean): void {
    if (breath) {
      breath.classList.toggle('is-active', active);
      breath.setAttribute('aria-hidden', active ? 'false' : 'true');
    }
    if (active) {
      startBreathChimes();
    } else {
      stopBreathChimes();
    }
  }

  function updateSoundButtons(): void {
    soundModeButtons.forEach(btn => {
      const mode = btn.dataset.mode as SoundMode | undefined;
      btn.setAttribute(
        'aria-pressed',
        mode === soundMode ? 'true' : 'false'
      );
    });
  }

  function paint(state: CountdownState): void {
    if (!display || !button) return;

    if (state.status === 'break') {
      display.textContent = 'Done';
      display.classList.add('timer-break');
      button.textContent = 'Start';
      button.setAttribute('aria-pressed', 'false');
      setStatus(STATUS_COMPLETE);
      setBreathActive(false);

      // Play chime once per completion (keyed on the new history head).
      const marker = state.history[0]?.completedAt ?? null;
      if (marker && marker !== lastChimedFor) {
        lastChimedFor = marker;
        playChime('high');
      }
    } else {
      display.classList.remove('timer-break');
      const remaining =
        state.status === 'running' ? state.remainingMs : state.durationMs;
      display.textContent = formatCountdownTime(remaining);

      if (state.status === 'running') {
        button.textContent = 'Stop';
        button.setAttribute('aria-pressed', 'true');
        setStatus(STATUS_RUNNING);
        setBreathActive(true);
      } else {
        button.textContent = 'Start';
        button.setAttribute('aria-pressed', 'false');
        setStatus(idleStatus(durationMin(state)));
        setBreathActive(false);
      }
    }

    renderPresets(state);
    renderHistory(state.history);
    renderStats(state.history);
  }

  // Start click — also the iOS unlock moment for the chime pool.
  // Each chime element gets a silent .play() inside this gesture so
  // later off-gesture .play() calls (every 4 s during a session) work.
  button.addEventListener('click', () => {
    const status = timer.store.getState().status;
    if (status === 'running') {
      timer.cancel();
    } else if (status === 'break') {
      timer.skipBreak();
    } else {
      unlockChimes();
      timer.start();
    }
  });

  updateSoundButtons();
  soundModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.mode as SoundMode | undefined;
      if (!next || !(SOUND_MODES as readonly string[]).includes(next)) return;
      if (next === soundMode) return;
      soundMode = next;
      try {
        localStorage.setItem(SOUND_MODE_KEY, soundMode);
      } catch {
        // localStorage unavailable — selection still applies for this session.
      }
      updateSoundButtons();
      // Tapping Chime is also a fine moment to unlock — covers the
      // case where the user toggles audio on after Start.
      unlockChimes();
      // If a session is currently running, apply the new mode immediately.
      if (timer.store.getState().status === 'running') {
        if (soundMode === 'bell') startBreathChimes();
        else stopBreathChimes();
      }
    });
  });

  presets.forEach(preset => {
    preset.addEventListener('click', () => {
      const min = Number(preset.dataset.duration);
      if (!Number.isFinite(min) || min <= 0) return;
      timer.setDuration(min * 60 * 1000);
    });
  });

  // Standalone ambient tiles — independent of the meditation timer, so
  // the user can start an OM drone or white noise without first kicking
  // off a session. Each tile owns its own HTMLAudioElement-on-tap-play
  // so iOS unlocks it during the play-button gesture itself.
  const tileHandles: AmbientTileHandle[] = [];
  if (omTileEl) {
    tileHandles.push(
      setupAmbientTile(omTileEl, {
        factory: createOmVoice('/audio/om.mp3'),
        storagePrefix: 'meditate.om',
        defaultVolume: 0.6,
      })
    );
  }
  if (noiseTileEl) {
    tileHandles.push(
      setupAmbientTile(noiseTileEl, {
        factory: createNoiseVoice('/audio/whitenoise.mp3'),
        storagePrefix: 'meditate.noise',
        defaultVolume: 0.5,
      })
    );
  }

  // Tick. core.refresh() is a no-op when not running, so the store
  // doesn't fire and the DOM stays stable.
  const intervalId = window.setInterval(() => {
    timer.refresh();
    if (timer.store.getState().status === 'running') {
      paint(timer.store.getState());
    }
  }, 1_000);

  // Snap back to current state when returning from a backgrounded tab.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      timer.refresh();
      paint(timer.store.getState());
    }
  });

  timer.store.subscribe(paint);
  paint(timer.store.getState());

  window.addEventListener('beforeunload', () => {
    window.clearInterval(intervalId);
    stopBreathChimes();
    tileHandles.forEach(h => h.dispose());
  });
});

void PRESET_MINUTES;
