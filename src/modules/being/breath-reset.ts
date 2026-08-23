export const RESET_INHALE_MS = 4_000;
export const RESET_EXHALE_MS = 6_000;
export const RESET_OM_VOLUME = 0.25;
const RESET_OM_URL = '/audio/om.mp3';

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

export interface BreathResetAudio {
  loop: boolean;
  preload: string;
  volume: number;
  currentTime: number;
  play(): Promise<void> | void;
  pause(): void;
}

export interface BreathResetSound {
  start(): void;
  stop(): void;
}

const browserScheduler: BreathResetScheduler = {
  set: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clear: timerId => window.clearTimeout(timerId),
};

export function createBreathResetSound(
  audio: BreathResetAudio,
  onPlaybackError: (error: unknown) => void = error =>
    console.warn('[centre reset] OM playback rejected:', error)
): BreathResetSound {
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = RESET_OM_VOLUME;

  const stop = (): void => {
    audio.pause();
    audio.currentTime = 0;
  };

  return {
    start: () => {
      audio.currentTime = 0;
      try {
        const playback = audio.play();
        if (playback && typeof playback.catch === 'function') {
          playback.catch(onPlaybackError);
        }
      } catch (error) {
        onPlaybackError(error);
      }
    },
    stop,
  };
}

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
        beginInhale(cycle + 1);
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
  const sound = createBreathResetSound(new Audio(RESET_OM_URL));

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
      if (!state.active) sound.stop();
    },
  });

  button.addEventListener('click', () => {
    if (controller.getState().active) {
      controller.stop();
      return;
    }
    beforeStart?.();
    // This remains directly inside the tap handler so iOS permits playback.
    // A rejected play never blocks the visual breathing guide.
    sound.start();
    controller.start();
  });
  // Do not stop on visibilitychange: iOS marks an installed PWA hidden when
  // the screen locks, while its media playback is still allowed to continue.
  window.addEventListener('beforeunload', controller.stop);
  return controller;
}
