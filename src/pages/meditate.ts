/**
 * Meditate page — countdown with completion chime and inline "Done"
 * banner.
 *
 * Self-contained for now; commit 2 will move the timer logic into a
 * shared core (extracted from quantumTimer) so both surfaces share one
 * persistence + state model.
 */

const PRESET_MINUTES = [5, 10, 20] as const;
const DEFAULT_DURATION_MIN = 10;
const COMPLETE_DISPLAY_MS = 6_000;
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
  const history = document.getElementById('meditate-history');
  const presets = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.meditate-preset')
  );
  if (!display || !button) return;

  let durationMin = DEFAULT_DURATION_MIN;
  let endsAt: number | null = null;
  let isActive = false;
  let tickIntervalId: number | null = null;
  let completeTimeoutId: number | null = null;
  let audioCtx: AudioContext | null = null;

  function durationMs(): number {
    return durationMin * 60 * 1000;
  }

  function format(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function paint(remainingMs: number): void {
    if (display) display.textContent = format(remainingMs);
  }

  function setLabel(label: string, pressed: boolean): void {
    if (!button) return;
    button.textContent = label;
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }

  function setStatus(text: string): void {
    if (status) status.textContent = text;
  }

  function setPresetsActive(active: boolean): void {
    presets.forEach(preset => {
      const min = Number(preset.dataset.duration);
      preset.disabled = active;
      preset.setAttribute(
        'aria-pressed',
        !active && min === durationMin ? 'true' : 'false'
      );
    });
  }

  function clearCompleteState(): void {
    if (completeTimeoutId !== null) {
      window.clearTimeout(completeTimeoutId);
      completeTimeoutId = null;
    }
    if (display) display.classList.remove('timer-break');
  }

  function stopTicking(): void {
    if (tickIntervalId !== null) {
      window.clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
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
      // Soft attack (10 ms) and exponential decay over ~600 ms.
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

  function recordSession(): void {
    if (!history) return;
    const empty = history.querySelector('.meditate-history__empty');
    if (empty) empty.remove();
    const card = document.createElement('div');
    card.className = 'meditate-history__entry';
    const when = new Date().toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    card.innerHTML = `
      <span class="meditate-history__label">${durationMin} min</span>
      <time class="meditate-history__time">${when}</time>
    `;
    history.insertBefore(card, history.firstChild);
  }

  function complete(): void {
    stopTicking();
    isActive = false;
    endsAt = null;
    setLabel('Start', false);
    setPresetsActive(false);
    if (display) display.classList.add('timer-break');
    if (display) display.textContent = 'Done';
    setStatus(STATUS_COMPLETE);
    recordSession();
    playChime();

    completeTimeoutId = window.setTimeout(() => {
      clearCompleteState();
      paint(durationMs());
      setStatus(idleStatus(durationMin));
    }, COMPLETE_DISPLAY_MS);
  }

  function tick(): void {
    if (endsAt === null) return;
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      complete();
      return;
    }
    paint(remaining);
  }

  function start(): void {
    if (isActive) return;
    // Wake the AudioContext on the user's start click so the chime is
    // allowed to play later (autoplay policies require a user gesture).
    ensureAudioCtx();
    clearCompleteState();
    isActive = true;
    endsAt = Date.now() + durationMs();
    setLabel('Stop', true);
    setStatus(STATUS_RUNNING);
    setPresetsActive(true);
    paint(durationMs());
    tickIntervalId = window.setInterval(tick, 1000);
  }

  function stop(): void {
    stopTicking();
    isActive = false;
    endsAt = null;
    clearCompleteState();
    setLabel('Start', false);
    setStatus(idleStatus(durationMin));
    setPresetsActive(false);
    paint(durationMs());
  }

  function selectDuration(min: number): void {
    if (isActive) return; // gated — preset clicks are inert mid-session
    if (!Number.isFinite(min) || min <= 0) return;
    durationMin = min;
    setStatus(idleStatus(durationMin));
    paint(durationMs());
    setPresetsActive(false);
  }

  // Initial paint
  setLabel('Start', false);
  setStatus(idleStatus(durationMin));
  setPresetsActive(false);
  paint(durationMs());

  button.addEventListener('click', () => {
    if (isActive) stop();
    else start();
  });

  presets.forEach(preset => {
    preset.addEventListener('click', () => {
      const min = Number(preset.dataset.duration);
      selectDuration(min);
    });
  });

  // Stop the tick if the page is being torn down. Pure hygiene — the
  // interval would die with the page anyway.
  window.addEventListener('beforeunload', () => {
    stopTicking();
    clearCompleteState();
  });
});

// Keep a reference so the unused-warning lint doesn't flag the import-only
// PRESET_MINUTES export. (Helps document the intended preset set.)
void PRESET_MINUTES;
