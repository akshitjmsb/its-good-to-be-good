/**
 * User chip — small "kept by <handle>" + sign-out link rendered above the
 * home header. Stays out of the way until you go looking for it.
 */

import { signOut } from '../domains/auth/session';
import { getAuthState, subscribeAuth } from '../domains/auth/store';

export function mountUserChip(host: HTMLElement): () => void {
  function render(): void {
    const { user } = getAuthState();
    if (!user) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    const handle = (user.email ?? '').split('@')[0] || 'kept';
    host.hidden = false;
    host.innerHTML = `
      <span class="user-chip__name">kept by ${escapeText(handle)}</span>
      <button type="button" class="user-chip__signout" data-action="signout">↩ sign out</button>
    `;

    const button = host.querySelector<HTMLButtonElement>('[data-action="signout"]');
    button?.addEventListener('click', async () => {
      try {
        await signOut();
      } catch (err) {
        console.error('[auth] sign-out failed:', err);
      }
      window.location.reload();
    });
  }

  render();
  return subscribeAuth(() => render());
}

function escapeText(value: string): string {
  return value.replace(/[&<>"']/g, ch => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
