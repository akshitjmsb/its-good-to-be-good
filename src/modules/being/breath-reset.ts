export const RESET_INHALE_MS = 4_000;
export const RESET_EXHALE_MS = 6_000;
export const RESET_CYCLES = 3;

export type BreathResetPhase = 'idle' | 'inhale' | 'exhale';

export interface BreathResetState {
  active: boolean;
  cycle: number;
  phase: BreathResetPhase;
}

interface BreathResetScheduler {
  set(callback: () => void, delayMs: number): number;
  clear(timerId: number): void;
}

interface BreathResetControllerOptions {
  scheduler?: BreathResetScheduler;
  onChange: (state: BreathResetState) => void;
}

export interface BreathResetController {
  start(): void;
  stop(): void;
  toggle(): void;
  getState(): BreathResetState;
}

const browserScheduler: BreathResetScheduler = {
  set: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clear: timerId => window.clearTimeout(timerId),
};

export function createBreathResetController({
  scheduler = browserScheduler,
  onChange,
}: BreathResetControllerOptions): BreathResetController {
  let state: BreathResetState = { active: false, cycle: 0, phase: 'idle' };
  let timerId: number | null = null;

  const publish = (next: BreathResetState): void => {
    state = next;
    onChange({ ...state });
  };

  const clearTimer = (): void => {
    if (timerId === null) return;
    scheduler.clear(timerId);
    timerId = null;
  };

  const schedule = (callback: () => void, delayMs: number): void => {
    clearTimer();
    timerId = scheduler.set(callback, delayMs);
  };

  const stop = (): void => {
    clearTimer();
    publish({ active: false, cycle: 0, phase: 'idle' });
  };

  const beginInhale = (cycle: number): void => {
    publish({ active: true, cycle, phase: 'inhale' });
    schedule(() => {
      publish({ active: true, cycle, phase: 'exhale' });
      schedule(() => {
        if (cycle >= RESET_CYCLES) stop();
        else beginInhale(cycle + 1);
      }, RESET_EXHALE_MS);
    }, RESET_INHALE_MS);
  };

  const start = (): void => {
    if (state.active) return;
    beginInhale(1);
  };

  return {
    start,
    stop,
    toggle: () => (state.active ? stop() : start()),
    getState: () => ({ ...state }),
  };
}

export function initBreathReset({
  beforeStart,
}: {
  beforeStart?: () => void;
} = {}): BreathResetController | null {
  const orbit = document.querySelector<HTMLElement>('.being-orbit');
  const button = document.getElementById('being-reset') as HTMLButtonElement | null;
  const status = document.getElementById('being-reset-status');
  if (!orbit || !button) return null;

  const controller = createBreathResetController({
    onChange: state => {
      orbit.classList.toggle('is-resetting', state.active);
      button.setAttribute('aria-pressed', state.active ? 'true' : 'false');
      button.dataset.phase = state.phase;
      if (status) {
        status.textContent =
          state.phase === 'inhale'
            ? 'Breathe in'
            : state.phase === 'exhale'
              ? 'Breathe out'
              : '';
      }
    },
  });

  button.addEventListener('click', () => {
    if (!controller.getState().active) beforeStart?.();
    controller.toggle();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') controller.stop();
  });
  window.addEventListener('beforeunload', controller.stop);
  return controller;
}
