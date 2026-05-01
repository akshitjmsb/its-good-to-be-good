import { createSafeHtml } from '../../../utils/escapeHtml';
import { TennisRoundup } from './types';

export function renderTennisRoundup(roundup: TennisRoundup): string {
  const safeText = createSafeHtml(roundup.text, { maxLength: 20000 });
  return `<div class="mb-4">${safeText}</div>`;
}
