/**
 * Home-page Quantum widget — top-right corner of the homepage.
 *
 * Pure view layer. The actual timer state lives in core/quantumTimer.ts
 * and is shared with the dedicated quantum.html page through a single
 * module-singleton + localStorage. This file only renders.
 */

import {
  formatQuantumTime,
  getQuantumTimer,
  type QuantumState,
} from '../platform/quantumTimer';

const TICK_MS = 1_000;
const BREAK_FALLBACK_MS = 12_000;

export function initializeQuantumTimer(): void {
  const button = document.getElementById(
    'quantum-timer-btn'
  ) as HTMLButtonElement | null;
  const display = document.getElementById('quantum-timer-display');
  if (!button || !display) return;

  const timer = getQuantumTimer();
  let lastSpokenMarker: string | null = null;
  let breakTeardownId: number | null = null;

  function render(state: QuantumState): void {
    if (!button || !display) return;
    if (state.status === 'break') {
      display.textContent = 'Break!';
      display.classList.add('timer-break');
      button.hidden = true;
      button.setAttribute('aria-pressed', 'false');
      announceBreakOnce(state);
      scheduleBreakTeardown();
    } else {
      display.classList.remove('timer-break');
      display.textContent = formatQuantumTime(
        state.status === 'running' ? state.remainingMs : state.durationMs
      );
      button.hidden = false;
      button.textContent = state.status === 'running' ? 'Stop' : 'Start';
      button.setAttribute(
        'aria-pressed',
        state.status === 'running' ? 'true' : 'false'
      );
      if (breakTeardownId !== null) {
        window.clearTimeout(breakTeardownId);
        breakTeardownId = null;
      }
    }
  }

  function announceBreakOnce(state: QuantumState): void {
    // Speak only once per completion. We key on history[0]?.completedAt so
    // the same break event doesn't get re-announced if render runs twice.
    const marker = state.history[0]?.completedAt ?? null;
    if (marker === null || marker === lastSpokenMarker) return;
    lastSpokenMarker = marker;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      if (synth.speaking) synth.cancel();
      const utterance = new SpeechSynthesisUtterance('Break time Akki boyyyyy');
      utterance.lang = 'en-US';
      utterance.onend = () => timer.skipBreak();
      utterance.onerror = () => timer.skipBreak();
      synth.speak(utterance);
    } catch (error) {
      console.error('Could not play text-to-speech audio.', error);
    }
  }

  function scheduleBreakTeardown(): void {
    if (breakTeardownId !== null) return;
    breakTeardownId = window.setTimeout(() => {
      breakTeardownId = null;
      timer.skipBreak();
    }, BREAK_FALLBACK_MS);
  }

  // Keep remainingMs fresh while running. The store fires listeners only
  // on actual state changes, so we re-render on the same cadence.
  const interval = window.setInterval(() => {
    timer.refresh();
    // refresh() is a no-op when idle/break, so re-render here for break
    // teardown after navigations etc.
    if (timer.store.getState().status !== 'running') return;
    render(timer.store.getState());
  }, TICK_MS);

  // Pause the tick when the tab is hidden so we don't burn CPU; refresh()
  // on visibility change snaps the display back to the correct value.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      timer.refresh();
      render(timer.store.getState());
    }
  });

  timer.store.subscribe(render);
  render(timer.store.getState());

  button.addEventListener('click', () => {
    const status = timer.store.getState().status;
    if (status === 'running') timer.cancel();
    else if (status === 'idle') timer.start();
    // (status === 'break' isn't reachable here — button is hidden.)
  });

  // Belt-and-braces: stop the interval if the page is being torn down.
  window.addEventListener('beforeunload', () => window.clearInterval(interval));
}
