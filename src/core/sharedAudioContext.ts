/**
 * Process-wide AudioContext. Lazy-init on first call, and resumes the
 * context every call so that the resume scheduling lands inside the
 * user-gesture handler that drove the call. Safari's autoplay policy
 * needs ctx.resume() inside the same task as the click — calling it
 * later from a then() / setTimeout / async tick is too late.
 */

interface AudioCtxCtor {
  new (): AudioContext;
  prototype: AudioContext;
}

let cached: AudioContext | null = null;

function getCtor(): AudioCtxCtor | null {
  const w = window as unknown as {
    AudioContext?: AudioCtxCtor;
    webkitAudioContext?: AudioCtxCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function getSharedAudioContext(): AudioContext | null {
  if (!cached) {
    const Ctor = getCtor();
    if (!Ctor) return null;
    try {
      cached = new Ctor();
    } catch (error) {
      console.warn('AudioContext unavailable:', error);
      return null;
    }
  }
  if (cached.state === 'suspended') {
    void cached.resume();
  }
  return cached;
}

export function peekSharedAudioContext(): AudioContext | null {
  return cached;
}
