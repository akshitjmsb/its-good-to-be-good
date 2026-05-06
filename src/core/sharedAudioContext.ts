/**
 * Process-wide AudioContext. Lazy-init on first call, and resumes the
 * context every call so that the resume scheduling lands inside the
 * user-gesture handler that drove the call. Safari's autoplay policy
 * needs ctx.resume() inside the same task as the click — calling it
 * later from a then() / setTimeout / async tick is too late.
 *
 * On first creation we also play a 1-sample silent buffer through the
 * destination. This is the long-standing iOS Safari "audio unlock"
 * trick — without it, the audio engine on iOS may stay quiet for the
 * rest of the page session even though state === 'running'.
 */

interface AudioCtxCtor {
  new (): AudioContext;
  prototype: AudioContext;
}

let cached: AudioContext | null = null;
let unlocked = false;

function getCtor(): AudioCtxCtor | null {
  const w = window as unknown as {
    AudioContext?: AudioCtxCtor;
    webkitAudioContext?: AudioCtxCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function unlockOnce(ctx: AudioContext): void {
  if (unlocked) return;
  unlocked = true;
  try {
    const buffer = ctx.createBuffer(1, 1, 22_050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (error) {
    console.warn('[audio] unlock buffer failed:', error);
  }
}

export function getSharedAudioContext(): AudioContext | null {
  if (!cached) {
    const Ctor = getCtor();
    if (!Ctor) {
      console.warn('[audio] no AudioContext constructor on window');
      return null;
    }
    try {
      cached = new Ctor();
      cached.addEventListener('statechange', () => {
        console.log('[audio] state →', cached?.state);
      });
      console.log('[audio] context created, state =', cached.state);
    } catch (error) {
      console.warn('[audio] context construction failed:', error);
      return null;
    }
  }
  // Both 'suspended' and (iOS-only) 'interrupted' need an explicit resume.
  const state = cached.state as AudioContextState | 'interrupted';
  if (state === 'suspended' || state === 'interrupted') {
    cached.resume().catch(error => {
      console.warn('[audio] resume rejected:', error);
    });
  }
  unlockOnce(cached);
  return cached;
}

export function peekSharedAudioContext(): AudioContext | null {
  return cached;
}
