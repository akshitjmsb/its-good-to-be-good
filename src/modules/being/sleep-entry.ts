import {
  createCountdownTimer,
  formatCountdownTime,
} from '../../platform/countdownTimer';
import { initializeAutomaticDim } from '../../platform/automaticDim';
import { registerAppWorker } from '../../platform/pwa/service-worker';
import { OUTSIDE_DURATION_MS, sleepActionForHour } from './sleep';
import './sleep.css';

initializeAutomaticDim();
void registerAppWorker();

document.addEventListener('DOMContentLoaded', () => {
  const host = document.getElementById('sleep-view');
  if (!host || sleepActionForHour(new Date().getHours()) !== 'outside') return;

  const timer = createCountdownTimer({
    namespace: 'sleep-outside',
    defaultDurationMs: OUTSIDE_DURATION_MS,
    storage: null,
  });

  host.innerHTML = `
    <div class="sleep-now">
      <button type="button" class="pillar-action pillar-action--icon sleep-now__action" aria-pressed="false" aria-label="Outside — ten minute light timer">
        <span class="pillar-action__glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16"></path><path d="M6 14a6 6 0 0 1 12 0"></path><path d="M12 3v3"></path><path d="m4.9 7.9 2.1 2.1"></path><path d="m19.1 7.9-2.1 2.1"></path></svg>
        </span>
        <span data-sleep-label role="timer">Outside</span>
      </button>
    </div>
  `;

  const button = host.querySelector<HTMLButtonElement>('button');
  const label = host.querySelector<HTMLElement>('[data-sleep-label]');
  const paint = (): void => {
    if (!button || !label) return;
    const state = timer.store.getState();
    button.setAttribute('aria-pressed', String(state.status === 'running'));
    label.textContent =
      state.status === 'running'
        ? formatCountdownTime(state.remainingMs)
        : state.status === 'break'
          ? 'Done'
          : 'Outside';
  };

  button?.addEventListener('click', () => {
    const state = timer.store.getState();
    if (state.status === 'running') timer.cancel();
    else {
      if (state.status === 'break') timer.skipBreak();
      timer.start();
    }
  });

  const unsubscribe = timer.store.subscribe(paint);
  const intervalId = window.setInterval(() => timer.refresh(), 1_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') timer.refresh();
  });
  window.addEventListener('beforeunload', () => {
    window.clearInterval(intervalId);
    unsubscribe();
    timer.destroy();
  });
  paint();
});
