/**
 * Dedicated Quantum page — large stage, persisted history, skip-break.
 *
 * Subscribes to the same core store as the home-page widget. Status,
 * remaining time, and the recent-sessions list all stay in sync across
 * tabs via the `storage` event in core/quantumTimer.ts.
 */

import {
  formatQuantumTime,
  getQuantumTimer,
  type QuantumSession,
  type QuantumState,
} from '../core/quantumTimer';

const STATUS_IDLE = '30 minute focus session';
const STATUS_RUNNING = 'Stay with it.';
const STATUS_BREAK = 'Session complete.';

document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('quantum-timer-display');
  const button = document.getElementById(
    'quantum-timer-btn'
  ) as HTMLButtonElement | null;
  const status = document.getElementById('quantum-status');
  const history = document.getElementById('quantum-history');
  if (!display || !button) return;

  const timer = getQuantumTimer();

  // The page exposes a Skip break action when in the break state. We
  // create it once, lazily, the first time we need it.
  let skipButton: HTMLButtonElement | null = null;
  function ensureSkipButton(): HTMLButtonElement {
    if (skipButton) return skipButton;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn quantum-skip';
    btn.textContent = 'Skip';
    btn.setAttribute('aria-label', 'Skip break');
    btn.addEventListener('click', () => timer.skipBreak());
    button!.insertAdjacentElement('afterend', btn);
    skipButton = btn;
    return btn;
  }

  function setStatus(text: string): void {
    if (status) status.textContent = text;
  }

  function renderHistory(sessions: QuantumSession[]): void {
    if (!history) return;
    if (sessions.length === 0) {
      history.innerHTML = `<p class="quantum-history__empty">No sessions yet.</p>`;
      return;
    }
    history.innerHTML = sessions
      .map(s => {
        const when = new Date(s.completedAt).toLocaleString('en-CA', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        const minutes = Math.round(s.durationMs / 60_000);
        return `
          <div class="quantum-history__entry">
            <span class="quantum-history__label">${minutes} min focus</span>
            <time class="quantum-history__time">${when}</time>
          </div>
        `;
      })
      .join('');
  }

  function render(state: QuantumState): void {
    if (!display || !button) return;
    if (state.status === 'break') {
      display.textContent = 'Break!';
      display.classList.add('timer-break');
      button.hidden = true;
      button.setAttribute('aria-pressed', 'false');
      setStatus(STATUS_BREAK);
      ensureSkipButton().hidden = false;
    } else {
      display.classList.remove('timer-break');
      display.textContent = formatQuantumTime(
        state.status === 'running' ? state.remainingMs : state.durationMs
      );
      button.hidden = false;
      if (skipButton) skipButton.hidden = true;
      if (state.status === 'running') {
        button.textContent = 'Stop';
        button.setAttribute('aria-pressed', 'true');
        setStatus(STATUS_RUNNING);
      } else {
        button.textContent = 'Start';
        button.setAttribute('aria-pressed', 'false');
        setStatus(STATUS_IDLE);
      }
    }
    renderHistory(state.history);
  }

  // 1 s tick when running. core.refresh() is a no-op when idle/break,
  // so the store doesn't fire listeners and DOM stays stable.
  const interval = window.setInterval(() => {
    timer.refresh();
    if (timer.store.getState().status === 'running') {
      render(timer.store.getState());
    }
  }, 1_000);

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
    else if (status === 'break') timer.skipBreak();
  });

  window.addEventListener('beforeunload', () => window.clearInterval(interval));
});
