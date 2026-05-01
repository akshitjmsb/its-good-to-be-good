/**
 * Home widget — small Quantum countdown in the top-right of the homepage.
 *
 * Tick is computed from `endsAt` against `Date.now()` rather than a
 * decrementing counter, so backgrounded tabs (where browsers throttle
 * setInterval) still display the right remaining time on the next tick.
 *
 * The completion break message is torn down on `utterance.onend` from
 * the SpeechSynthesis API; a 12 s safety timeout covers cases where
 * speech is unavailable or never fires.
 */

const SESSION_MS = 30 * 60 * 1000;
const BREAK_FALLBACK_MS = 12_000;
const LABEL_IDLE = 'Start';
const LABEL_RUNNING = 'Stop';

let tickIntervalId: number | null = null;
let breakTimeoutId: number | null = null;
let endsAt: number | null = null;
let isActive = false;
let buttonEl: HTMLButtonElement | null = null;
let displayEl: HTMLElement | null = null;

function format(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function paint(remainingMs: number): void {
  if (!displayEl) return;
  displayEl.textContent = format(remainingMs);
}

function setLabel(label: string, pressed: boolean): void {
  if (!buttonEl) return;
  buttonEl.textContent = label;
  buttonEl.setAttribute('aria-pressed', pressed ? 'true' : 'false');
}

function clearBreakState(): void {
  if (breakTimeoutId !== null) {
    window.clearTimeout(breakTimeoutId);
    breakTimeoutId = null;
  }
  if (displayEl) displayEl.classList.remove('timer-break');
  if (buttonEl) buttonEl.hidden = false;
}

function announceBreak(): void {
  if (!displayEl) return;
  displayEl.textContent = 'Break!';
  displayEl.classList.add('timer-break');
  if (buttonEl) buttonEl.hidden = true;

  let cleared = false;
  const finish = () => {
    if (cleared) return;
    cleared = true;
    clearBreakState();
    paint(SESSION_MS);
  };

  // Fire-and-forget speech, but key the UI reset to its `onend` event so
  // the break banner clears exactly when the announcement finishes.
  let spokeOk = false;
  try {
    const synth = window.speechSynthesis;
    if (synth) {
      if (synth.speaking) synth.cancel();
      const utterance = new SpeechSynthesisUtterance('Break time Akki boyyyyy');
      utterance.lang = 'en-US';
      utterance.onend = finish;
      utterance.onerror = finish;
      synth.speak(utterance);
      spokeOk = true;
    }
  } catch (error) {
    console.error('Could not play text-to-speech audio.', error);
  }

  // Safety net — if TTS is silent (no voices, blocked, mobile autoplay
  // restrictions), the break still tears down within a fixed window.
  breakTimeoutId = window.setTimeout(finish, spokeOk ? BREAK_FALLBACK_MS : BREAK_FALLBACK_MS / 2);
}

function tick(): void {
  if (endsAt === null) return;
  const remaining = endsAt - Date.now();
  if (remaining <= 0) {
    stopTicking();
    isActive = false;
    endsAt = null;
    setLabel(LABEL_IDLE, false);
    announceBreak();
    return;
  }
  paint(remaining);
}

function stopTicking(): void {
  if (tickIntervalId !== null) {
    window.clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
}

function start(): void {
  if (isActive) return;
  isActive = true;
  endsAt = Date.now() + SESSION_MS;
  clearBreakState();
  setLabel(LABEL_RUNNING, true);
  paint(SESSION_MS);
  tickIntervalId = window.setInterval(tick, 1000);
}

function stop(): void {
  stopTicking();
  isActive = false;
  endsAt = null;
  clearBreakState();
  setLabel(LABEL_IDLE, false);
  paint(SESSION_MS);
}

export function initializeQuantumTimer(): void {
  buttonEl = document.getElementById('quantum-timer-btn') as HTMLButtonElement | null;
  displayEl = document.getElementById('quantum-timer-display');

  if (!buttonEl) return;
  setLabel(LABEL_IDLE, false);
  paint(SESSION_MS);

  buttonEl.addEventListener('click', () => {
    if (isActive) stop();
    else start();
  });
}
