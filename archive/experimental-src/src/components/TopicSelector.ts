/**
 * Topic Selector Component
 * Grid of learning topics for It's Good To Be King
 */

import { SessionContentType, TOPIC_METADATA, getAllTopics, getSessionCounts, getLatestSession } from '../core/learning-sessions';
import { DEFAULT_USER_ID } from '../core/default-user';

export interface TopicSelectHandler {
    (topic: SessionContentType, hasExistingSession: boolean): void;
}

let onTopicSelect: TopicSelectHandler | null = null;
let sessionCounts: Record<string, number> = {};

/**
 * Initialize the topic selector
 */
export function initializeTopicSelector(handler: TopicSelectHandler): void {
    onTopicSelect = handler;
    renderTopicSelector();
    loadSessionCounts();
}

/**
 * Load session counts for each topic
 */
async function loadSessionCounts(): Promise<void> {
    try {
        sessionCounts = await getSessionCounts(DEFAULT_USER_ID);
        updateTopicBadges();
    } catch (error) {
        console.error('Error loading session counts:', error);
    }
}

/**
 * Update badge counts on topic cards
 */
function updateTopicBadges(): void {
    const topics = getAllTopics();
    for (const topic of topics) {
        const badge = document.querySelector(`[data-topic="${topic}"] .session-count`);
        if (badge) {
            const count = sessionCounts[topic] || 0;
            badge.textContent = count > 0 ? `${count}` : '';
            badge.classList.toggle('hidden', count === 0);
        }
    }
}

/**
 * Render the topic selector grid
 */
export function renderTopicSelector(): void {
    const container = document.getElementById('topic-selector');
    if (!container) return;

    const topics = getAllTopics();

    container.innerHTML = `
        <div class="topic-selector-header">
            <h2 class="topic-selector-title">What would you like to explore?</h2>
            <p class="topic-selector-subtitle">Choose a topic to start learning</p>
        </div>
        <div class="topic-grid">
            ${topics.map(topic => renderTopicCard(topic)).join('')}
        </div>
    `;

    // Attach click handlers
    const cards = container.querySelectorAll('.topic-card');
    cards.forEach(card => {
        card.addEventListener('click', handleTopicClick);
    });
}

/**
 * Render a single topic card
 */
function renderTopicCard(topic: SessionContentType): string {
    const meta = TOPIC_METADATA[topic];
    const count = sessionCounts[topic] || 0;

    return `
        <button class="topic-card" data-topic="${topic}">
            <span class="topic-icon">${meta.icon}</span>
            <span class="topic-label">${meta.label}</span>
            <span class="topic-description">${meta.description}</span>
            <span class="session-count ${count === 0 ? 'hidden' : ''}">${count > 0 ? count : ''}</span>
        </button>
    `;
}

/**
 * Handle topic card click
 */
async function handleTopicClick(event: Event): Promise<void> {
    const card = (event.currentTarget as HTMLElement);
    const topic = card.dataset.topic as SessionContentType;

    if (!topic || !onTopicSelect) return;

    // Check if there's an existing session for this topic
    const latestSession = await getLatestSession(DEFAULT_USER_ID, topic);
    const hasExistingSession = latestSession !== null;

    onTopicSelect(topic, hasExistingSession);
}

/**
 * Refresh session counts (call after creating a new session)
 */
export function refreshTopicCounts(): void {
    loadSessionCounts();
}
