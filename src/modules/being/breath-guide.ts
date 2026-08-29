export const BREATH_GUIDE_URL = '/audio/breath-guide.mp3';
export const BREATH_GUIDE_VOLUME = 0.45;

export interface BreathGuideAudio {
  loop: boolean;
  preload: string;
  volume: number;
  currentTime: number;
  play(): Promise<void> | void;
  pause(): void;
}

export interface BreathGuideSound {
  start(): void;
  stop(): void;
}

/** A continuous media track keeps 4-in / 6-out cues alive through iOS lock. */
export function createBreathGuideSound(
  audio: BreathGuideAudio,
  onPlaybackError: (error: unknown) => void = error =>
    console.warn('[breathe] guide playback rejected:', error)
): BreathGuideSound {
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = BREATH_GUIDE_VOLUME;

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
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
    },
  };
}
