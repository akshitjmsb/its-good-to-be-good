/**
 * UI primitives provided by the shell.
 *
 * Toasts and loading states are intentionally minimal — plain text on
 * the existing palette to stay in the vintage-typewriter look. Anything
 * fancier belongs inside the module.
 */

import type { UIAdapter } from './types';

const TOAST_CONTAINER_ID = 'king-sdk-toast-host';

function ensureToastHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let host = document.getElementById(TOAST_CONTAINER_ID);
  if (host) return host;
  host = document.createElement('div');
  host.id = TOAST_CONTAINER_ID;
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  Object.assign(host.style, {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    pointerEvents: 'none',
  });
  document.body.appendChild(host);
  return host;
}

export function createUIAdapter(): UIAdapter {
  return {
    showToast(message: string, opts?: { durationMs?: number }) {
      const host = ensureToastHost();
      if (!host) return;
      const toast = document.createElement('div');
      toast.textContent = message;
      Object.assign(toast.style, {
        background: '#111',
        color: '#f4f4f4',
        padding: '6px 12px',
        fontFamily: '"Special Elite", monospace',
        fontSize: '13px',
        letterSpacing: '0.04em',
        borderRadius: '2px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        pointerEvents: 'auto',
      });
      host.appendChild(toast);
      const duration = opts?.durationMs ?? 2400;
      window.setTimeout(() => {
        toast.remove();
      }, duration);
    },
    confirm(message: string) {
      if (typeof window === 'undefined') return Promise.resolve(false);
      return Promise.resolve(window.confirm(message));
    },
    showLoading(container: HTMLElement, message = 'Loading…') {
      const node = document.createElement('p');
      node.textContent = message;
      node.dataset.kingSdkLoading = 'true';
      node.style.fontFamily = '"Special Elite", monospace';
      node.style.color = '#6b7280';
      container.appendChild(node);
      return () => {
        if (node.parentNode === container) container.removeChild(node);
      };
    },
  };
}
