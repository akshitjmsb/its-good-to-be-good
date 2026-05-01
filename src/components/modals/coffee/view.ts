import { escapeHtml } from '../../../utils/escapeHtml';
import { CoffeeLesson } from './types';

export function renderCoffeeLesson(lesson: CoffeeLesson): string {
  return `
    <h4 class="font-bold text-md mb-2">${escapeHtml(lesson.title)}</h4>
    <p class="text-base mb-4">${escapeHtml(lesson.explanation)}</p>
    <div class="mt-4 pt-4 border-t border-gray-200">
      <p class="text-sm font-bold">Key Takeaway:</p>
      <p class="text-sm italic">${escapeHtml(lesson.takeaway)}</p>
    </div>
  `;
}
