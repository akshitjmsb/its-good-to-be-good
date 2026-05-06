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

const SOUND_MODE_KEY = 'meditate.soundMode';
const LEGACY_SOUND_KEY = 'meditate.soundEnabled';
type SoundMode = 'bell' | 'om' | 'noise' | 'off';
const SOUND_MODES: readonly SoundMode[] = ['bell', 'om', 'noise', 'off'];

const OM_FUNDAMENTAL_HZ = 432;
const OM_PARTIAL_GAINS = [0.4, 0.18, 0.08] as const; // 1×, 2×, 3×
const OM_MASTER_PEAK = 0.18;
const OM_LFO_HZ = 0.15;
const OM_LFO_DEPTH = 0.04;
const OM_FADE_S = 1.5;

const NOISE_PEAK_GAIN = 0.08;
const NOISE_LP_HZ = 6_000;
const NOISE_FADE_S = 0.4;

interface OmVoice {
  oscillators: OscillatorNode[];
  lfo: OscillatorNode;
  master: GainNode;
}

interface NoiseVoice {
  source: AudioBufferSourceNode;
  master: GainNode;
}

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
  if (!display || !button) return;

  const timer = getMeditateTimer();

  let lastChimedFor: string | null = null; // history[0]?.completedAt
  let audioCtx: AudioContext | null = null;
  let breathChimeInterval: number | null = null;
  let breathPhase = 0;
  let breathChimesActive = false;
  let omVoice: OmVoice | null = null;
  let noiseVoice: NoiseVoice | null = null;
  let noiseBuffer: AudioBuffer | null = null;

  let soundMode: SoundMode = 'bell';
  try {
    const stored = localStorage.getItem(SOUND_MODE_KEY);
    if (stored && (SOUND_MODES as readonly string[]).includes(stored)) {
      soundMode = stored as SoundMode;
    } else {
      // Migrate from the previous boolean toggle if present.
      const legacy = localStorage.getItem(LEGACY_SOUND_KEY);
      if (legacy === 'false') soundMode = 'off';
      if (legacy !== null) {
        localStorage.setItem(SOUND_MODE_KEY, soundMode);
        localStorage.removeItem(LEGACY_SOUND_KEY);
      }
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
  // tone than a bare sine. Quick attack, exponential decay. Caller
  // decides whether to invoke (gated by soundMode upstream).
  function playBell(freq: number, peakGain = 0.18, decaySeconds = 0.5): void {
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
    // Only fires in bell mode; OM/Noise modes provide their own continuous
    // cue and a chime would clash. Off mode stays silent.
    if (soundMode !== 'bell') return;
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

  // Continuous 432 Hz drone: fundamental + 2× + 3× partials through a
  // gentle low-pass, slow LFO modulating master gain for a chant-like
  // breathing texture. 1.5 s attack/release fades avoid clicks.
  function startOm(): void {
    if (omVoice) return;
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;

      const oscillators: OscillatorNode[] = [];
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2_400;
      lp.Q.value = 0.707;

      OM_PARTIAL_GAINS.forEach((gainValue, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = OM_FUNDAMENTAL_HZ * (i + 1);
        const partialGain = ctx.createGain();
        partialGain.gain.value = gainValue;
        osc.connect(partialGain);
        partialGain.connect(lp);
        osc.start(now);
        oscillators.push(osc);
      });

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(OM_MASTER_PEAK, now + OM_FADE_S);
      lp.connect(master);
      master.connect(ctx.destination);

      // LFO adds onto master.gain.value for ±OM_LFO_DEPTH modulation.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = OM_LFO_HZ;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = OM_LFO_DEPTH;
      lfo.connect(lfoDepth);
      lfoDepth.connect(master.gain);
      lfo.start(now);

      omVoice = { oscillators, lfo, master };
    } catch (error) {
      console.warn('Could not start OM drone:', error);
    }
  }

  function stopOm(): void {
    if (!omVoice) return;
    const voice = omVoice;
    omVoice = null;
    const ctx = audioCtx;
    if (!ctx) {
      voice.oscillators.forEach(o => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      try {
        voice.lfo.stop();
      } catch {
        /* already stopped */
      }
      return;
    }
    const now = ctx.currentTime;
    try {
      voice.master.gain.cancelScheduledValues(now);
      voice.master.gain.setValueAtTime(voice.master.gain.value, now);
      voice.master.gain.exponentialRampToValueAtTime(0.0001, now + OM_FADE_S);
      const stopAt = now + OM_FADE_S + 0.05;
      voice.oscillators.forEach(o => o.stop(stopAt));
      voice.lfo.stop(stopAt);
    } catch (error) {
      console.warn('Could not stop OM drone:', error);
    }
  }

  function buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
      return noiseBuffer;
    }
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buffer;
    return buffer;
  }

  function startNoise(): void {
    if (noiseVoice) return;
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;

      const source = ctx.createBufferSource();
      source.buffer = buildNoiseBuffer(ctx);
      source.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = NOISE_LP_HZ;
      lp.Q.value = 0.707;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(
        NOISE_PEAK_GAIN,
        now + NOISE_FADE_S
      );

      source.connect(lp);
      lp.connect(master);
      master.connect(ctx.destination);
      source.start(now);

      noiseVoice = { source, master };
    } catch (error) {
      console.warn('Could not start noise:', error);
    }
  }

  function stopNoise(): void {
    if (!noiseVoice) return;
    const voice = noiseVoice;
    noiseVoice = null;
    const ctx = audioCtx;
    if (!ctx) {
      try {
        voice.source.stop();
      } catch {
        /* already stopped */
      }
      return;
    }
    const now = ctx.currentTime;
    try {
      voice.master.gain.cancelScheduledValues(now);
      voice.master.gain.setValueAtTime(voice.master.gain.value, now);
      voice.master.gain.exponentialRampToValueAtTime(0.0001, now + NOISE_FADE_S);
      voice.source.stop(now + NOISE_FADE_S + 0.05);
    } catch (error) {
      console.warn('Could not stop noise:', error);
    }
  }

  // Idempotent: each start helper early-returns if already running, each
  // stop helper is a no-op when nothing is active. Safe to call from a
  // per-second paint or from a mid-session mode switch.
  function applySessionAudio(running: boolean): void {
    if (!running) {
      stopBreathChimes();
      stopOm();
      stopNoise();
      return;
    }
    ensureAudioCtx();
    switch (soundMode) {
      case 'bell':
        stopOm();
        stopNoise();
        startBreathChimes();
        break;
      case 'om':
        stopBreathChimes();
        stopNoise();
        startOm();
        break;
      case 'noise':
        stopBreathChimes();
        stopOm();
        startNoise();
        break;
      case 'off':
        stopBreathChimes();
        stopOm();
        stopNoise();
        break;
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
    applySessionAudio(active);
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
      // Wake audio on this gesture so future starts don't need a warm-up.
      ensureAudioCtx();
      // If a session is running, swap the ambient track immediately.
      if (timer.store.getState().status === 'running') {
        applySessionAudio(true);
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
    applySessionAudio(false);
  });
});

void PRESET_MINUTES;
