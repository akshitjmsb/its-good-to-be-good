/**
 * Login gate — single-overlay sign-in / sign-up / magic-link UI mounted
 * when no Supabase session is present.
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
} from '../domains/auth/session';

type Mode = 'sign-in' | 'sign-up' | 'magic-link';

// Full-detail Vitruvian Man — matches the home page logo in index.html so the
// gate and the home read as the same silhouette. The earlier simplified
// version (10 paths, sub-pixel stroke widths at 72px) rendered as a faint
// outline on mobile.
const VITRUVIAN_SVG = `
  <svg class="logo-svg" viewBox="0 0 520 505" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" aria-hidden="true">
    <circle cx="260" cy="252" r="208" stroke-width="1.2"/>
    <rect x="52" y="84" width="416" height="416" stroke-width="1.2"/>
    <circle cx="260" cy="114" r="32" stroke-width="1.8"/>
    <path d="M229,101 C227,91 231,83 237,85 C236,77 240,72 245,79" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M254,79 C256,70 260,68 264,79" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M264,79 C268,70 272,70 275,79 C278,72 283,72 284,83 C289,80 290,91 288,101" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M230,104 C232,90 244,84 260,84 C276,84 288,90 290,104" stroke-width="0.9"/>
    <path d="M228,114 C222,112 221,121 227,123" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M292,114 C298,112 299,121 293,123" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M248,146 L244,166" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M272,146 L276,166" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M244,166 Q210,162 150,170" stroke-width="0.9"/>
    <path d="M276,166 Q310,162 370,170" stroke-width="0.9"/>
    <path d="M150,170 C133,177 127,194 136,214 C140,226 144,235 216,255 L206,292 C200,305 197,318 214,332 L240,340" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M370,170 C387,177 393,194 384,214 C380,226 376,235 304,255 L314,292 C320,305 323,318 306,332 L280,340" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M240,340 Q260,348 280,340" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="260" y1="166" x2="260" y2="224" stroke-width="0.9"/>
    <path d="M244,170 C238,180 228,192 218,202" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M276,170 C282,180 292,192 302,202" stroke-width="0.9" stroke-linecap="round"/>
    <path d="M230,216 L252,216 M268,216 L290,216" stroke-width="0.75"/>
    <path d="M226,228 L252,228 M268,228 L294,228" stroke-width="0.75"/>
    <path d="M222,240 L252,240 M268,240 L298,240" stroke-width="0.75"/>
    <circle cx="260" cy="254" r="2.8" fill="currentColor" stroke="none"/>
    <path d="M150,170 C124,173 98,175 74,176 C66,177 58,176 52,178" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M370,170 C396,173 422,175 446,176 C454,177 462,176 468,178" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M150,170 C128,157 106,143 86,131 C78,126 70,120 62,112" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M370,170 C392,157 414,143 434,131 C442,126 450,120 458,112" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M240,340 C236,360 232,383 234,406 C235,424 236,447 236,464 L234,496" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M280,340 C284,360 288,383 286,406 C285,424 284,447 284,464 L286,496" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M234,496 C224,500 208,500 194,496" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M286,496 C296,500 312,500 326,496" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M240,340 C220,362 196,388 170,413 C152,432 133,452 114,474" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M280,340 C300,362 324,388 350,413 C368,432 387,452 406,474" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M114,474 C102,478 88,479 76,475" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M406,474 C418,478 432,479 444,475" stroke-width="1.8" stroke-linecap="round"/>
  </svg>
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
