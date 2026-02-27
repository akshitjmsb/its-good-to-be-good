import { escapeHtml } from '../../../utils/escapeHtml';
import { AnalyticsTopic } from './types';

export function createAnalyticsCardHTML(
  topic: AnalyticsTopic,
  index: number
): string {
  const cardId = `analytics-card-${index}`;

  if (topic.isQuestion) {
    const encodedPrompt = btoa(topic.data.prompt);
    const encodedSolution = btoa(topic.data.solution);
    const safePrompt = escapeHtml(topic.data.prompt).replace(/\n/g, '<br>');

    return `
      <div class="analytics-card" id="${cardId}">
        <div class="analytics-card-header">
          <div class="analytics-card-title">${topic.icon} ${escapeHtml(topic.data.title)}</div>
          <div class="analytics-card-type">${topic.type}</div>
        </div>
        <div class="analytics-card-content">
          <div class="analytics-card-question">
            <p class="text-sm leading-relaxed">${safePrompt}</p>
          </div>
          <button class="analytics-card-solution-btn"
                  data-prompt="${encodedPrompt}"
                  data-solution="${encodedSolution}"
                  data-card-id="${cardId}">
            Show Solution
          </button>
          <div class="analytics-card-solution" id="solution-${cardId}"></div>
        </div>
      </div>
    `;
  }

  const content = topic.data as unknown as Record<string, unknown>;
  if (typeof content.explanation === 'string') {
    const formattedExplanation = escapeHtml(content.explanation).replace(
      /\n/g,
      '<br>'
    );
    return `
      <div class="analytics-card" id="${cardId}">
        <div class="analytics-card-header">
          <div class="analytics-card-title">${topic.icon} ${escapeHtml(String(content.title))}</div>
          <div class="analytics-card-type">${topic.type}</div>
        </div>
        <div class="analytics-card-content">
          <div class="analytics-card-explanation">
            <div class="text-sm leading-relaxed">${formattedExplanation}</div>
          </div>
        </div>
      </div>
    `;
  }

  const issues = Array.isArray(content.issues)
    ? (content.issues as string[])
    : [];
  const transformations = Array.isArray(content.transformations)
    ? (content.transformations as string[])
    : [];

  return `
    <div class="analytics-card" id="${cardId}">
      <div class="analytics-card-header">
        <div class="analytics-card-title">${topic.icon} ${escapeHtml(String(content.title ?? 'Data Quality'))}</div>
        <div class="analytics-card-type">${topic.type}</div>
      </div>
      <div class="analytics-card-content">
        <div class="analytics-card-issues">
          <p class="mb-3"><strong>Data Type:</strong> ${escapeHtml(String(content.dataType ?? 'Unknown'))}</p>
          <h5>Potential Issues:</h5>
          <ul class="mb-4">
            ${issues.map(issue => `<li>${escapeHtml(issue).replace(/\n/g, '<br>')}</li>`).join('')}
          </ul>
          <h5>Corrective Transformations:</h5>
          <ul>
            ${transformations.map(item => `<li>${escapeHtml(item).replace(/\n/g, '<br>')}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
}
