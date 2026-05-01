/**
 * Dedicated Quantum page — large stage view of the same focus timer.
 *
 * Tick is computed from `endsAt` against `Date.now()` rather than a
 * decrementing counter, so the timer stays accurate when the tab is
 * backgrounded. Completion shows an inline "Break!" treatment instead
 * of a blocking `window.alert`.
 *
 * NOTE: this is still a duplicate of components/quantumTimer.ts. The
 * unification + persistence pass lands in the next commit.
 */

const SESSION_MS = 30 * 60 * 1000;
const BREAK_DISPLAY_MS = 6_000;
const LABEL_IDLE = 'Start';
const LABEL_RUNNING = 'Stop';
const STATUS_IDLE = '30 minute focus session';
const STATUS_RUNNING = 'Stay with it.';
const STATUS_BREAK = 'Session complete.';

document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('quantum-timer-display');
  const button = document.getElementById('quantum-timer-btn') as HTMLButtonElement | null;
  const status = document.getElementById('quantum-status');
  const history = document.getElementById('quantum-history');

  if (!display || !button) return;

  let isActive = false;
  let endsAt: number | null = null;
  let tickIntervalId: number | null = null;
  let breakTimeoutId: number | null = null;

  const format = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const paint = (remainingMs: number): void => {
    display.textContent = format(remainingMs);
  };

  const setLabel = (label: string, pressed: boolean): void => {
    button.textContent = label;
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  };

  const setStatus = (text: string): void => {
    if (status) status.textContent = text;
  };

  const clearBreakDisplay = (): void => {
    if (breakTimeoutId !== null) {
      window.clearTimeout(breakTimeoutId);
      breakTimeoutId = null;
    }
    display.classList.remove('timer-break');
  };

  const stopTicking = (): void => {
    if (tickIntervalId !== null) {
      window.clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
  };

  const recordSession = (): void => {
    if (!history) return;
    const empty = history.querySelector('.quantum-history__empty');
    if (empty) empty.remove();
    const card = document.createElement('div');
    card.className = 'quantum-history__entry';
    const when = new Date().toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    card.innerHTML = `
      <span class="quantum-history__label">Quantum session</span>
      <time class="quantum-history__time">${when}</time>
    `;
    history.insertBefore(card, history.firstChild);
  };

  const announceBreak = (): void => {
    display.textContent = 'Break!';
    display.classList.add('timer-break');
    setStatus(STATUS_BREAK);
    breakTimeoutId = window.setTimeout(() => {
      clearBreakDisplay();
      setStatus(STATUS_IDLE);
      paint(SESSION_MS);
    }, BREAK_DISPLAY_MS);
  };

  const tick = (): void => {
    if (endsAt === null) return;
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      stopTicking();
      isActive = false;
      endsAt = null;
      setLabel(LABEL_IDLE, false);
      recordSession();
      announceBreak();
      return;
    }
    paint(remaining);
  };

  const start = (): void => {
    if (isActive) return;
    isActive = true;
    endsAt = Date.now() + SESSION_MS;
    clearBreakDisplay();
    setLabel(LABEL_RUNNING, true);
    setStatus(STATUS_RUNNING);
    paint(SESSION_MS);
    tickIntervalId = window.setInterval(tick, 1000);
  };

  const stop = (): void => {
    stopTicking();
    isActive = false;
    endsAt = null;
    clearBreakDisplay();
    setLabel(LABEL_IDLE, false);
    setStatus(STATUS_IDLE);
    paint(SESSION_MS);
  };

  setLabel(LABEL_IDLE, false);
  setStatus(STATUS_IDLE);
  paint(SESSION_MS);

  button.addEventListener('click', () => {
    if (isActive) stop();
    else start();
  });
});
