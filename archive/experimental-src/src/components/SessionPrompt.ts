/**
 * Session Prompt Component
 * "New session or continue?" dialog for It's Good To Be King
 */

import { SessionContentType, TOPIC_METADATA } from '../core/learning-sessions';

export type SessionChoice = 'new' | 'continue' | 'browse';

export interface SessionPromptHandler {
    (choice: SessionChoice, topic: SessionContentType): void | Promise<void>;
}

let currentTopic: SessionContentType | null = null;
let onChoiceSelect: SessionPromptHandler | null = null;

/**
 * Show the session prompt for a topic
 */
export function showSessionPrompt(
    topic: SessionContentType,
    hasExistingSession: boolean,
    handler: SessionPromptHandler
): void {
    currentTopic = topic;
    onChoiceSelect = handler;

    const meta = TOPIC_METADATA[topic];

    // Create prompt container
    const container = document.createElement('div');
    container.id = 'session-prompt-modal';
    container.className = 'session-prompt';
    container.innerHTML = `
        <div class="session-prompt-content">
            <div class="session-prompt-icon">${meta.icon}</div>
            <h3 class="session-prompt-title">${meta.label}</h3>
            <p class="session-prompt-subtitle">${meta.description}</p>
            <div class="session-prompt-actions">
                <button class="session-btn session-btn-primary" data-choice="new">
                    Start Fresh Session
                </button>
                ${hasExistingSession ? `
                    <button class="session-btn session-btn-secondary" data-choice="continue">
                        Continue Last Session
                    </button>
                ` : ''}
                ${hasExistingSession ? `
                    <button class="session-btn session-btn-link" data-choice="browse">
                        Browse Past Sessions
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    // Add to DOM
    document.body.appendChild(container);

    // Attach event listeners
    container.addEventListener('click', handlePromptClick);

    // Close on backdrop click
    container.addEventListener('click', (e) => {
        if (e.target === container) {
            closeSessionPrompt();
        }
    });

    // Close on escape
    const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeSessionPrompt();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * Handle button clicks in the prompt
 */
function handlePromptClick(event: Event): void {
    const target = event.target as HTMLElement;
    const choice = target.dataset.choice as SessionChoice;

    if (choice && currentTopic && onChoiceSelect) {
        closeSessionPrompt();
        onChoiceSelect(choice, currentTopic);
    }
}

/**
 * Close the session prompt
 */
export function closeSessionPrompt(): void {
    const container = document.getElementById('session-prompt-modal');
    if (container) {
        container.remove();
    }
    currentTopic = null;
    onChoiceSelect = null;
}
