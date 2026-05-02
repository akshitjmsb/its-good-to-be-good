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

  function playChime(): void {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.65);
    } catch (error) {
      console.warn('Could not play chime:', error);
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
    if (!breath) return;
    breath.classList.toggle('is-active', active);
    breath.setAttribute('aria-hidden', active ? 'false' : 'true');
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

  window.addEventListener('beforeunload', () => window.clearInterval(intervalId));
});

void PRESET_MINUTES;
