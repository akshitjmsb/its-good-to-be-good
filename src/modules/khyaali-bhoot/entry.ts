import './khyaali-bhoot.css';
import { registerServiceWorker } from '../../platform/registerServiceWorker';

/**
 * Khyaali Bhoot -- talk to your imaginary ghosts.
 *
 * Inspired by TVF's "Sapne vs Everyone" and Elizabeth Gilbert's Big Magic:
 * fear is a passenger, not the driver. Open the page, write to whatever
 * ghost is haunting you right now, tap "Let it go", and watch it dissolve.
 *
 * No persistence, no history. The act of writing is the release.
 */

const PROMPTS = [
  "What's the ghost saying today?",
  'What fear is whispering right now?',
  'Name the ghost. Take its power.',
  'What are you afraid of today?',
  "What thought won't leave you alone?",
  "What's haunting you right now?",
  'The ghost is here. Talk to it.',
  'Say it. Write it down. Let it hear you.',
];

const WHISPERS = [
  "The ghost heard you. It's leaving now.",
  'You faced it. It has no power here.',
  'It dissolves. You remain.',
  "Gone. You're still standing.",
  'The ghost fades. You stay.',
  'You spoke. It listened. It left.',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function init(): void {
  const promptEl = document.getElementById('kb-prompt');
  const textarea = document.getElementById('kb-textarea') as HTMLTextAreaElement | null;
  const releaseBtn = document.getElementById('kb-release-btn') as HTMLButtonElement | null;
  const whisperEl = document.getElementById('kb-whisper');
  const actionsEl = document.getElementById('kb-actions');

  if (!textarea || !releaseBtn || !whisperEl || !promptEl || !actionsEl) return;

  // Set a random prompt on load.
  promptEl.textContent = pickRandom(PROMPTS);

  // Enable the button only when there's text.
  textarea.addEventListener('input', () => {
    releaseBtn.disabled = textarea.value.trim().length === 0;
  });

  // "Let it go" -- dissolve the text.
  releaseBtn.addEventListener('click', () => {
    if (!textarea.value.trim()) return;

    // Fade the writing area.
    textarea.classList.add('kb-dissolving');
    releaseBtn.disabled = true;

    // After the fade, clear and show the whisper.
    setTimeout(() => {
      textarea.value = '';
      textarea.classList.remove('kb-dissolving');
      actionsEl.classList.add('kb-hidden');

      whisperEl.textContent = pickRandom(WHISPERS);
      whisperEl.hidden = false;
      whisperEl.classList.add('kb-whisper--visible');

      // After a few seconds, reset for the next ghost.
      setTimeout(() => {
        whisperEl.classList.remove('kb-whisper--visible');
        setTimeout(() => {
          whisperEl.hidden = true;
          actionsEl.classList.remove('kb-hidden');
          promptEl.textContent = pickRandom(PROMPTS);
          textarea.focus();
        }, 400);
      }, 3000);
    }, 800);
  });

  // Focus the textarea on load.
  textarea.focus();
}

document.addEventListener('DOMContentLoaded', init);

registerServiceWorker();
