/**
 * Home bootstrap — the orbit page.
 *
 * The home is mostly static markup (the orbit paints with the document).
 * This file owns the thin runtime around it: the auth gate, the user chip,
 * the header clock, the quantum timer widget, and the centre reset via
 * `initBeingOrbit()`.
 */

import { initializeQuantumTimer } from './quantumTimer';
import { initBeingOrbit } from '../modules/being/orbit';
import { initAuthStore, getAuthState } from '../platform/auth/store';
import { onAuthStateChange } from '../platform/auth/session';
import { mountLoginGate } from './loginGate';
import { mountUserChip } from './userChip';

function updateTimeDisplay(): void {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  const el = document.getElementById('current-datetime');
  if (el) el.textContent = new Date().toLocaleString('en-CA', options);
}

export async function bootstrapApp(): Promise<void> {
  // Each step is guarded so one failure can't silently deaden the rest of
  // the home (the orbit especially). Failures are named in the console and
  // surfaced as a quiet banner instead of a dead page.
  const failures: string[] = [];
  const attempt = (name: string, step: () => void): void => {
    try {
      step();
    } catch (error) {
      failures.push(name);
      console.error(`[home] ${name} failed to initialize:`, error);
    }
  };

  // Wire the auth-independent surface FIRST. The soul practices, the quantum
  // timer, and the clock need no session, so a slow or wedged auth probe must
  // never be able to take them down (the frozen-orbit "vegetable state":
  // the static markup paints, but nothing responds).

  // PWA users on the home screen have no browser refresh button.
  attempt('refresh button', () => {
    document
      .getElementById('header-refresh-btn')
      ?.addEventListener('click', () => window.location.reload());
  });

  attempt('clock', () => {
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
  });

  attempt('quantum timer', () => initializeQuantumTimer());
  attempt('orbit', () => initBeingOrbit());

  if (failures.length > 0) {
    const note = document.createElement('p');
    note.className = 'text-xs text-center';
    note.style.color = 'var(--home-muted, #6b7280)';
    note.textContent = `⚠ ${failures.join(', ')} failed to load — pull down to refresh.`;
    document.getElementById('app-container')?.prepend(note);
  }

  // Only now resolve auth. getSession() bounds the probe with a timeout, and
  // this await is guarded too — an auth failure degrades to the login gate,
  // never to a dead page.
  try {
    await initAuthStore();
  } catch (error) {
    console.error(
      '[home] auth bootstrap failed — treating as signed out:',
      error
    );
  }
  const authedUser = getAuthState().user;

  if (!authedUser) {
    const host = document.getElementById('app-container');
    if (host) mountLoginGate(host);
    // Once the user signs in, Convex Auth fires SIGNED_IN — reload so the
    // full app boots cleanly with the new session.
    onAuthStateChange((_event, session) => {
      if (session) window.location.reload();
    });
    return;
  }

  // After sign-out, reload to drop module state cleanly and re-mount the gate.
  onAuthStateChange((_event, session) => {
    if (!session) window.location.reload();
  });

  attempt('user chip', () => {
    const chipHost = document.getElementById('user-chip');
    if (chipHost) mountUserChip(chipHost);
  });
}
