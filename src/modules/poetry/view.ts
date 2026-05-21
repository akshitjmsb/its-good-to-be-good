import { escapeHtml } from '../../utils/escapeHtml';
import type { PoetryMoment } from './types';

export function renderPoetryMoment(data: PoetryMoment): string {
  const byline = [data.poet, data.language].filter(Boolean).join(' · ');
  const bylineHtml = byline
    ? `<p class="text-center text-xs text-gray-600 mb-2">${escapeHtml(byline)}</p>`
    : '';

  return `
    <div class="mb-6">
      <h4 class="text-lg font-bold mb-1 text-center">Poetry in Motion</h4>
      ${bylineHtml}
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <div class="text-sm leading-relaxed mb-4">${escapeHtml(data.scene)}</div>
        <div class="border-l-4 border-blue-500 pl-4 my-4">
          <p class="text-lg font-semibold mb-2">${escapeHtml(data.couplet)}</p>
          <p class="text-sm text-gray-600 mb-2">${escapeHtml(data.transliteration)}</p>
          <p class="text-sm italic">"${escapeHtml(data.translation)}"</p>
        </div>
        <div class="bg-blue-50 p-3 rounded-lg mt-4">
          <h5 class="font-bold mb-2 text-sm">About the Writer:</h5>
          <p class="text-sm leading-relaxed">${escapeHtml(data.aboutWriter)}</p>
        </div>
      </div>
    </div>
  `;
}

export function renderPoetryFallback(rawText: string): string {
  return `
    <div class="mb-6">
      <h4 class="text-lg font-bold mb-3 text-center">Poetry in Motion</h4>
      <div class="bg-gray-50 p-4 rounded-lg">
        <p class="text-sm leading-relaxed">${escapeHtml(rawText)}</p>
      </div>
    </div>
  `;
}
