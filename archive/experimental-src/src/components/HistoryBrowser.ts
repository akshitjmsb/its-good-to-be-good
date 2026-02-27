/**
 * History Browser Component
 * Browse learning sessions by topic or timeline for It's Good To Be King
 */

import {
    SessionContentType,
    SessionSummary,
    TOPIC_METADATA,
    getAllTopics,
    getRecentSessions,
    getSessionsByType,
    getSessionCounts
} from '../core/learning-sessions';
import { DEFAULT_USER_ID } from '../core/default-user';

export type HistoryViewMode = 'timeline' | 'topics';

export interface HistorySessionHandler {
    (sessionId: string, contentType: SessionContentType): void;
}

let currentViewMode: HistoryViewMode = 'timeline';
let onSessionSelect: HistorySessionHandler | null = null;

/**
 * Initialize the history browser
 */
export function initializeHistoryBrowser(handler: HistorySessionHandler): void {
    onSessionSelect = handler;

    // Listen for session-created events to auto-refresh
    window.addEventListener('session-created', () => {
        // Refresh the history browser when a new session is created
        showHistoryBrowser(currentViewMode);
    });
}

/**
 * Show the history browser
 */
export async function showHistoryBrowser(mode: HistoryViewMode = 'timeline'): Promise<void> {
    currentViewMode = mode;

    const container = document.getElementById('history-browser');
    if (!container) {
        console.error('History browser container not found');
        return;
    }

    container.innerHTML = `
        <div class="history-browser">
            <div class="history-header">
                <h2 class="history-title">Learning History</h2>
                <div class="history-tabs">
                    <button class="history-tab ${mode === 'timeline' ? 'active' : ''}" data-mode="timeline">
                        Timeline
                    </button>
                    <button class="history-tab ${mode === 'topics' ? 'active' : ''}" data-mode="topics">
                        By Topic
                    </button>
                </div>
            </div>
            <div id="history-content" class="history-list">
                <div class="text-center p-4 text-gray-500">Loading...</div>
            </div>
        </div>
    `;

    // Attach tab handlers
    const tabs = container.querySelectorAll('.history-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', async (e) => {
            const newMode = (e.currentTarget as HTMLElement).dataset.mode as HistoryViewMode;
            if (newMode !== currentViewMode) {
                await showHistoryBrowser(newMode);
            }
        });
    });

    // Load content based on mode
    if (mode === 'timeline') {
        await renderTimelineView();
    } else {
        await renderTopicsView();
    }
}

/**
 * Render timeline view (recent sessions across all topics)
 */
async function renderTimelineView(): Promise<void> {
    const contentEl = document.getElementById('history-content');
    if (!contentEl) return;

    const sessions = await getRecentSessions(DEFAULT_USER_ID, 30);

    if (sessions.length === 0) {
        contentEl.innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">📚</div>
                <p class="history-empty-text">No learning sessions yet.<br>Start exploring to build your history!</p>
            </div>
        `;
        return;
    }

    contentEl.innerHTML = sessions.map(session => renderHistoryItem(session)).join('');

    // Attach click handlers
    const items = contentEl.querySelectorAll('.history-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const sessionId = (item as HTMLElement).dataset.sessionId;
            const contentType = (item as HTMLElement).dataset.contentType as SessionContentType;
            if (sessionId && contentType && onSessionSelect) {
                onSessionSelect(sessionId, contentType);
            }
        });
    });
}

/**
 * Render topics view (grouped by topic)
 */
async function renderTopicsView(): Promise<void> {
    const contentEl = document.getElementById('history-content');
    if (!contentEl) return;

    const counts = await getSessionCounts(DEFAULT_USER_ID);
    const topics = getAllTopics();
    const topicsWithSessions = topics.filter(topic => counts[topic] && counts[topic] > 0);

    if (topicsWithSessions.length === 0) {
        contentEl.innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">📚</div>
                <p class="history-empty-text">No learning sessions yet.<br>Start exploring to build your history!</p>
            </div>
        `;
        return;
    }

    // Render each topic group
    let html = '';
    for (const topic of topicsWithSessions) {
        const meta = TOPIC_METADATA[topic];
        const count = counts[topic] || 0;
        const sessions = await getSessionsByType(DEFAULT_USER_ID, topic, 5);

        html += `
            <div class="topic-group">
                <div class="topic-group-header">
                    <span class="topic-group-icon">${meta.icon}</span>
                    <span class="topic-group-title">${meta.label}</span>
                    <span class="topic-group-count">${count} session${count !== 1 ? 's' : ''}</span>
                </div>
                <div class="history-list">
                    ${sessions.map(session => renderHistoryItem(session)).join('')}
                </div>
            </div>
        `;
    }

    contentEl.innerHTML = html;

    // Attach click handlers
    const items = contentEl.querySelectorAll('.history-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const sessionId = (item as HTMLElement).dataset.sessionId;
            const contentType = (item as HTMLElement).dataset.contentType as SessionContentType;
            if (sessionId && contentType && onSessionSelect) {
                onSessionSelect(sessionId, contentType);
            }
        });
    });
}

/**
 * Render a single history item
 */
function renderHistoryItem(session: SessionSummary): string {
    const meta = TOPIC_METADATA[session.content_type];
    const formattedDate = formatDate(session.created_at);
    const title = session.title || `${meta.label} Session`;

    return `
        <div class="history-item" data-session-id="${session.id}" data-content-type="${session.content_type}">
            <span class="history-item-icon">${meta.icon}</span>
            <div class="history-item-content">
                <div class="history-item-title">${escapeHtml(title)}</div>
                <div class="history-item-meta">${formattedDate}</div>
            </div>
            <span class="history-item-type">${meta.label}</span>
        </div>
    `;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Today - show time
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

/**
 * Simple HTML escaping
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Hide the history browser
 */
export function hideHistoryBrowser(): void {
    const container = document.getElementById('history-browser');
    if (container) {
        container.innerHTML = '';
    }
}
