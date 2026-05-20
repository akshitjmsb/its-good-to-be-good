/**
 * AI provider selector — the small "powered by <provider> ▾" dropdown that
 * sits under the date/time line on the home header.
 *
 * Reads/writes the selection through the domain provider store so any AI
 * call site picks the new provider up on its next request. Providers without
 * an API key are still selectable but tagged "(no key)" so the user knows
 * why a request might fail.
 */

import {
  getSelectedProvider,
  onProviderChange,
  setSelectedProvider,
} from '../domains/ai/providerStore';
import { listProviders } from '../infra/ai/client';
import type { ProviderId } from '../infra/ai/providers/types';

const HOST_ID = 'ai-provider-select';

function renderOptions(select: HTMLSelectElement, active: ProviderId): void {
  select.innerHTML = '';
  for (const provider of listProviders()) {
    const option = document.createElement('option');
    option.value = provider.id;
    const suffix = provider.isReady() ? '' : ' (no key)';
    option.textContent = `${provider.displayName}${suffix}`;
    if (provider.id === active) option.selected = true;
    select.appendChild(option);
  }
}

export function initializeAIProviderSelect(): void {
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  if (host.dataset.initialized === 'true') return;
  host.dataset.initialized = 'true';

  host.textContent = '';

  const prefix = document.createElement('span');
  prefix.className = 'ai-provider-select__prefix';
  prefix.textContent = 'powered by ';

  const select = document.createElement('select');
  select.className = 'ai-provider-select__select';
  select.setAttribute('aria-label', 'AI provider');

  const caret = document.createElement('span');
  caret.className = 'ai-provider-select__caret';
  caret.setAttribute('aria-hidden', 'true');
  caret.textContent = '▾';

  renderOptions(select, getSelectedProvider());

  select.addEventListener('change', () => {
    setSelectedProvider(select.value as ProviderId);
  });

  onProviderChange(id => {
    if (select.value !== id) select.value = id;
  });

  host.appendChild(prefix);
  host.appendChild(select);
  host.appendChild(caret);
}
