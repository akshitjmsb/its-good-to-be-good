import { createSafeHtml } from '../../utils/escapeHtml';
import type { WorldOrderHeadlines } from './types';

export function renderWorldOrderHeadlines(headlines: WorldOrderHeadlines): string {
  const safeText = createSafeHtml(headlines.text.replace(/\*/g, ''), {
    maxLength: 15000,
  });
  return `<div class="mb-4">${safeText}</div>`;
}
