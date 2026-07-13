/**
 * Login gate — single-overlay sign-in / sign-up / magic-link UI mounted
 * when no Convex session is present.
 *
 * The shell reloads on successful sign-in (`detectSessionInUrl` for magic
 * links, explicit reload for password) so we don't need to coordinate a
 * partial module teardown.
 */

import {
  resetPasswordForEmail,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from '../platform/auth/session';

type Mode = 'sign-in' | 'sign-up' | 'magic-link';

// Leonardo's Vitruvian Man — the same monochrome ink rendition of the actual
// drawing used for the home page logo, so the gate and the home read as one.
const VITRUVIAN_SVG = `
  <img class="logo-svg" src="/vitruvian-man-mono.png" alt=""
       width="398" height="366" decoding="async" aria-hidden="true" />
`;

function template(): string {
  return `
    <div class="auth-gate" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">
      <form class="auth-gate__card" id="auth-gate-form" novalidate>
        <div class="auth-gate__brand">
          ${VITRUVIAN_SVG}
          <h1 class="auth-gate__title" id="auth-gate-title">It's Good To Be King</h1>
        </div>

        <div class="auth-gate__tabs" role="tablist">
          <button type="button" class="auth-gate__tab" role="tab" data-mode="sign-in" aria-selected="true">Sign in</button>
          <button type="button" class="auth-gate__tab" role="tab" data-mode="sign-up" aria-selected="false">Sign up</button>
          <button type="button" class="auth-gate__tab" role="tab" data-mode="magic-link" aria-selected="false">Magic link</button>
        </div>

        <div class="auth-gate__field">
          <label class="auth-gate__label" for="auth-gate-email">Email</label>
          <input id="auth-gate-email" class="auth-gate__input" type="email" name="email" autocomplete="email" required>
        </div>

        <div class="auth-gate__field" data-password-field>
          <label class="auth-gate__label" for="auth-gate-password">Password</label>
          <input id="auth-gate-password" class="auth-gate__input" type="password" name="password" autocomplete="current-password" minlength="6">
        </div>

        <div class="auth-gate__actions">
          <button type="button" class="auth-gate__secondary" data-action="forgot">→ reset password</button>
          <button type="submit" class="auth-gate__submit">enter ▸</button>
        </div>

        <p class="auth-gate__feedback" data-feedback aria-live="polite"></p>
      </form>
    </div>
  `;
}

function readableError(err: unknown): string {
  if (err instanceof Error) return err.message.replace(/^AuthApiError:\s*/i, '');
  return 'Something went wrong. Try again.';
}

export function mountLoginGate(host: HTMLElement): void {
  document.body.classList.add('auth-gate-open');
  host.innerHTML = template();

  const form = host.querySelector<HTMLFormElement>('#auth-gate-form');
  if (!form) return;

  const emailInput = form.querySelector<HTMLInputElement>('#auth-gate-email');
  const passwordInput = form.querySelector<HTMLInputElement>('#auth-gate-password');
  const passwordField = form.querySelector<HTMLElement>('[data-password-field]');
  const feedback = form.querySelector<HTMLElement>('[data-feedback]');
  const submitBtn = form.querySelector<HTMLButtonElement>('.auth-gate__submit');
  const forgotBtn = form.querySelector<HTMLButtonElement>('[data-action="forgot"]');
  const tabs = Array.from(form.querySelectorAll<HTMLButtonElement>('.auth-gate__tab'));

  let mode: Mode = 'sign-in';

  function setMode(next: Mode): void {
    mode = next;
    tabs.forEach(tab => {
      const selected = tab.dataset.mode === next;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    if (passwordField) passwordField.hidden = next === 'magic-link';
    if (passwordInput) {
      passwordInput.required = next !== 'magic-link';
      passwordInput.autocomplete = next === 'sign-up' ? 'new-password' : 'current-password';
    }
    if (forgotBtn) forgotBtn.hidden = next !== 'sign-in';
    setFeedback('');
  }

  function setFeedback(message: string): void {
    if (feedback) feedback.textContent = message;
  }

  function setBusy(busy: boolean): void {
    if (submitBtn) submitBtn.disabled = busy;
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const next = tab.dataset.mode as Mode | undefined;
      if (next) setMode(next);
    });
  });

  forgotBtn?.addEventListener('click', async () => {
    const email = emailInput?.value.trim() ?? '';
    if (!email) {
      setFeedback('Enter your email above first.');
      return;
    }
    setBusy(true);
    try {
      await resetPasswordForEmail(email);
      setFeedback('Reset link sent. Check your inbox.');
    } catch (err) {
      setFeedback(readableError(err));
    } finally {
      setBusy(false);
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const email = emailInput?.value.trim() ?? '';
    const password = passwordInput?.value ?? '';
    if (!email) {
      setFeedback('Enter your email.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'magic-link') {
        await signInWithMagicLink(email);
        setFeedback('Magic link sent. Click it from your inbox to sign in.');
        return;
      }
      if (mode === 'sign-up') {
        const { session } = await signUpWithPassword(email, password);
        if (!session) {
          setFeedback('Account created. Check your inbox to confirm, then sign in.');
          return;
        }
        // Session granted immediately (project has email-confirm off).
        window.location.reload();
        return;
      }
      await signInWithPassword(email, password);
      window.location.reload();
    } catch (err) {
      setFeedback(readableError(err));
    } finally {
      setBusy(false);
    }
  });

  setMode('sign-in');
}
