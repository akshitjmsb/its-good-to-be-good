/**
 * Meditate page — view layer over the shared countdown core.
 *
 * The timer + persistence + cross-tab sync live in
 * `src/core/countdownTimer.ts` (consumed via `getMeditateTimer()`).
 * This file owns the meditation-specific UI: chime on completion,
 * breath-ring guidance during running sessions, preset duration row,
 * and stats panel.
 */

import {
  type CountdownSession,
  type CountdownState,
  currentStreak,
  formatCountdownTime,
  sessionsThisWeek,
  totalMinutes,
} from '../core/countdownTimer';
import { getMeditateTimer } from '../core/meditateTimer';

const PRESET_MINUTES = [5, 10, 20] as const;
const STATUS_RUNNING = 'Stay with the breath.';
const STATUS_COMPLETE = 'Session complete.';
const idleStatus = (mins: number) => `${mins} minute session`;

// 4-4-4-4 box breathing — anchor chime per phase. Inhale rides high,
// exhale drops a full octave to signal release; the two holds share a
// neutral mid pitch.
const PHASE_FREQS = [880, 660, 440, 660] as const; // inhale, hold, exhale, hold
const PHASE_MS = 4_000;
const SOUND_PREF_KEY = 'meditate.soundEnabled';

interface AudioCtxCtor {
  new (): AudioContext;
  prototype: AudioContext;
}

function getAudioCtxCtor(): AudioCtxCtor | null {
  const w = window as unknown as {
    AudioContext?: AudioCtxCtor;
    webkitAudioContext?: AudioCtxCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('meditate-display');
  const button = document.getElementById(
    'meditate-toggle'
  ) as HTMLButtonElement | null;
  const soundButton = document.getElementById(
    'meditate-sound'
  ) as HTMLButtonElement | null;
  const status = document.getElementById('meditate-status');
  const breath = document.getElementById('meditate-breath');
  const history = document.getElementById('meditate-history');
  const statWeek = document.getElementById('meditate-stat-week');
  const statStreak = document.getElementById('meditate-stat-streak');
  const statTotal = document.getElementById('meditate-stat-total');
  const presets = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.meditate-preset')
  );
  if (!display || !button) return;

  const timer = getMeditateTimer();

  let lastChimedFor: string | null = null; // history[0]?.completedAt
  let audioCtx: AudioContext | null = null;
  let breathChimeInterval: number | null = null;
  let breathPhase = 0;
  let breathChimesActive = false;

  let soundEnabled = true;
  try {
    const stored = localStorage.getItem(SOUND_PREF_KEY);
    if (stored !== null) soundEnabled = stored === 'true';
  } catch {
    // localStorage may be unavailable (private mode); default stays true.
  }

  function durationMin(state: CountdownState): number {
    return Math.round(state.durationMs / 60_000);
  }

  function setStatus(text: string): void {
    if (status) status.textContent = text;
  }

  function ensureAudioCtx(): AudioContext | null {
    if (audioCtx) return audioCtx;
    const Ctor = getAudioCtxCtor();
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch (error) {
      console.warn('AudioContext unavailable:', error);
      audioCtx = null;
    }
    return audioCtx;
  }

  // Layered fundamental + 2× harmonic gives a softer, more bell-like
  // tone than a bare sine. Quick attack, exponential decay.
  function playBell(freq: number, peakGain = 0.18, decaySeconds = 0.5): void {
    if (!soundEnabled) return;
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      const fund = ctx.createOscillator();
      const harm = ctx.createOscillator();
      const fundGain = ctx.createGain();
      const harmGain = ctx.createGain();

      fund.type = 'sine';
      harm.type = 'sine';
      fund.frequency.value = freq;
      harm.frequency.value = freq * 2;

      fundGain.gain.setValueAtTime(0.0001, now);
      fundGain.gain.exponentialRampToValueAtTime(peakGain, now + 0.008);
      fundGain.gain.exponentialRampToValueAtTime(0.0001, now + decaySeconds);

      harmGain.gain.setValueAtTime(0.0001, now);
      harmGain.gain.exponentialRampToValueAtTime(peakGain * 0.3, now + 0.008);
      harmGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + decaySeconds * 0.8
      );

      fund.connect(fundGain);
      harm.connect(harmGain);
      fundGain.connect(ctx.destination);
      harmGain.connect(ctx.destination);

      fund.start(now);
      harm.start(now);
      fund.stop(now + decaySeconds + 0.05);
      harm.stop(now + decaySeconds + 0.05);
    } catch (error) {
      console.warn('Could not play bell:', error);
    }
  }

  function playChime(): void {
    // Session-end chime — slightly louder + longer than a phase anchor.
    playBell(880, 0.25, 0.6);
  }

  function startBreathChimes(): void {
    if (breathChimesActive) return;
    breathChimesActive = true;
    breathPhase = 0;
    playBell(PHASE_FREQS[0]);
    breathChimeInterval = window.setInterval(() => {
      breathPhase = (breathPhase + 1) % PHASE_FREQS.length;
      playBell(PHASE_FREQS[breathPhase]);
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

  function updateSoundButton(): void {
    if (!soundButton) return;
    soundButton.textContent = soundEnabled ? 'Sound on' : 'Sound off';
    soundButton.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
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
    if (statWeek) statWeek.textContent = String(sessionsThisWeek(history$));
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
        playChime();
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

  // Wake the AudioContext on the user's start click (autoplay gesture).
  button.addEventListener('click', () => {
    const status = timer.store.getState().status;
    if (status === 'running') {
      timer.cancel();
    } else if (status === 'break') {
      timer.skipBreak();
    } else {
      ensureAudioCtx();
      timer.start();
    }
  });

  updateSoundButton();
  soundButton?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    try {
      localStorage.setItem(SOUND_PREF_KEY, String(soundEnabled));
    } catch {
      // localStorage may be unavailable; the toggle still works for
      // the current session.
    }
    updateSoundButton();
    if (soundEnabled) {
      // Wake audio on the toggle gesture so the next phase chime plays
      // without an extra start-click warm-up.
      ensureAudioCtx();
    }
  });

  presets.forEach(preset => {
    preset.addEventListener('click', () => {
      const min = Number(preset.dataset.duration);
      if (!Number.isFinite(min) || min <= 0) return;
      timer.setDuration(min * 60 * 1000);
    });
  });

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
  });
});

void PRESET_MINUTES;
