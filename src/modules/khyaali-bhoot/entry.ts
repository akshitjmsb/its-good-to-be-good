import './khyaali-bhoot.css';
import { registerAppWorker } from '../../platform/pwa/service-worker';

void registerAppWorker();

/** Write the fear, then let it go. Nothing is stored. */
function init(): void {
  const textarea = document.getElementById(
    'kb-textarea'
  ) as HTMLTextAreaElement | null;
  const releaseBtn = document.getElementById(
    'kb-release-btn'
  ) as HTMLButtonElement | null;

  if (!textarea || !releaseBtn) return;

  textarea.addEventListener('input', () => {
    releaseBtn.disabled = textarea.value.trim().length === 0;
  });

  releaseBtn.addEventListener('click', () => {
    if (!textarea.value.trim()) return;

    textarea.classList.add('kb-dissolving');
    releaseBtn.disabled = true;

    window.setTimeout(() => {
      textarea.value = '';
      textarea.classList.remove('kb-dissolving');
      textarea.focus();
    }, 500);
  });

  textarea.focus();
}

document.addEventListener('DOMContentLoaded', init);
