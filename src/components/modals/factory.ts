/**
 * Modal Factory
 * Provides common patterns for modal operations
 */

import { createSession, SessionContentType, LearningSession } from '../../core/learning-sessions';
import { DEFAULT_USER_ID } from '../../core/default-user';

export interface ModalElements {
    modal: HTMLElement;
    content: HTMLElement;
    title?: HTMLElement;
}

export interface ModalConfig {
    modalId: string;
    contentId: string;
    titleId?: string;
    loadingMessage?: string;
}

/**
 * Get modal elements by IDs
 */
export function getModalElements(config: ModalConfig): ModalElements | null {
    const modal = document.getElementById(config.modalId);
    const content = document.getElementById(config.contentId);

    if (!modal || !content) {
        console.error(`Modal elements not found: ${config.modalId}`);
        return null;
    }

    const elements: ModalElements = { modal, content };

    if (config.titleId) {
        const title = document.getElementById(config.titleId);
        if (title) elements.title = title;
    }

    return elements;
}

/**
 * Show modal with loading state
 */
export function showModalWithLoading(
    elements: ModalElements,
    loadingMessage: string = 'Loading...'
): void {
    elements.modal.classList.remove('hidden');
    elements.modal.classList.add('flex');
    elements.content.innerHTML = `<p>${loadingMessage}</p>`;
}

/**
 * Hide modal
 */
export function hideModal(elements: ModalElements): void {
    elements.modal.classList.add('hidden');
    elements.modal.classList.remove('flex');
}

/**
 * Show error in modal
 */
export function showModalError(
    elements: ModalElements,
    message: string = 'An error occurred. Please try again.'
): void {
    elements.content.innerHTML = `<p>${message}</p>`;
}

/**
 * Set modal content
 */
export function setModalContent(elements: ModalElements, html: string): void {
    elements.content.innerHTML = html;
}

/**
 * Set modal title
 */
export function setModalTitle(elements: ModalElements, title: string): void {
    if (elements.title) {
        elements.title.textContent = title;
    }
}

/**
 * Generic modal handler type
 */
export type ContentFetcher<T> = () => Promise<T>;
export type ContentRenderer<T> = (data: T) => string;

/**
 * Create a simple modal handler
 * Handles: open modal, show loading, fetch content, render or show error
 */
export function createSimpleModalHandler<T>(
    config: ModalConfig,
    fetcher: ContentFetcher<T>,
    renderer: ContentRenderer<T>,
    errorMessage?: string
): () => Promise<void> {
    return async () => {
        const elements = getModalElements(config);
        if (!elements) return;

        showModalWithLoading(elements, config.loadingMessage);

        try {
            const data = await fetcher();
            if (data) {
                setModalContent(elements, renderer(data));
            } else {
                showModalError(elements, errorMessage || 'Could not load content.');
            }
        } catch (error) {
            console.error(`Error in modal ${config.modalId}:`, error);
            showModalError(elements, errorMessage || 'An error occurred.');
        }
    };
}

/**
 * Modal configuration registry
 * Maps modal names to their configuration
 */
export const MODAL_CONFIGS: Record<string, ModalConfig> = {
    coffee: {
        modalId: 'coffee-modal',
        contentId: 'coffee-content',
        loadingMessage: "Loading today's coffee lesson..."
    },
    tennis: {
        modalId: 'tennis-modal',
        contentId: 'tennis-content',
        loadingMessage: 'Searching the web for latest match information...'
    },
    history: {
        modalId: 'history-modal',
        contentId: 'history-content',
        loadingMessage: 'Searching YouTube for a history video...'
    },
    worldOrder: {
        modalId: 'geopolitics-modal',
        contentId: 'geopolitics-headlines-content',
        loadingMessage: 'Searching the web for the latest headlines...'
    },
    poetry: {
        modalId: 'poetry-modal',
        contentId: 'poetry-content',
        loadingMessage: 'Generating beautiful poetry for you...'
    },
    guitar: {
        modalId: 'guitar-modal',
        contentId: 'guitar-content',
        loadingMessage: 'Finding a song for you...'
    },
    french: {
        modalId: 'frenchy-modal',
        contentId: 'modal-frenchy-table-body',
        titleId: 'modal-frenchy-title',
        loadingMessage: '<tr><td colspan="5" class="text-center p-4">Loading French lesson...</td></tr>'
    },
    food: {
        modalId: 'food-modal',
        contentId: 'food-plan-content',
        titleId: 'food-modal-title',
        loadingMessage: 'Loading food plan...'
    },
    hood: {
        modalId: 'hood-modal',
        contentId: 'hood-explanation-content',
        titleId: 'hood-modal-title',
        loadingMessage: 'Loading topic...'
    },
    analytics: {
        modalId: 'analytics-engineer-modal',
        contentId: 'analytics-cards-wrapper',
        loadingMessage: 'Loading analytics topics...'
    },
    exercise: {
        modalId: 'exercise-modal',
        contentId: 'exercise-content',
        titleId: 'exercise-modal-title',
        loadingMessage: 'Loading exercise plan...'
    }
};

/**
 * Get a modal config by name
 */
export function getModalConfig(name: string): ModalConfig | undefined {
    return MODAL_CONFIGS[name];
}

/**
 * Map modal names to SessionContentType
 */
export const MODAL_TO_SESSION_TYPE: Record<string, SessionContentType> = {
    coffee: 'coffee',
    tennis: 'tennis',
    history: 'history',
    worldOrder: 'geopolitics',
    poetry: 'poetry',
    guitar: 'guitar',
    french: 'french',
    food: 'food',
    hood: 'hood',
    analytics: 'analytics',
    exercise: 'exercise'
};

/**
 * Save content as a learning session
 * Call this after successfully generating content in a modal
 */
export async function saveSessionContent(
    modalName: string,
    content: Record<string, unknown>,
    title?: string
): Promise<LearningSession | null> {
    const contentType = MODAL_TO_SESSION_TYPE[modalName];
    if (!contentType) {
        console.warn(`No session type mapping for modal: ${modalName}`);
        return null;
    }

    try {
        const session = await createSession(DEFAULT_USER_ID, contentType, content, title);
        if (session) {
            console.log(`Session saved for ${modalName}:`, session.id);
            // Dispatch event for history browser refresh
            window.dispatchEvent(new CustomEvent('session-created', { detail: { session } }));
        }
        return session;
    } catch (error) {
        console.error(`Error saving session for ${modalName}:`, error);
        return null;
    }
}

/**
 * Check if a content type has a corresponding modal
 */
export function getModalNameForContentType(contentType: SessionContentType): string | null {
    for (const [modalName, type] of Object.entries(MODAL_TO_SESSION_TYPE)) {
        if (type === contentType) {
            return modalName;
        }
    }
    return null;
}

/**
 * Display saved session content in a modal
 * This is used when loading content from the history browser
 */
export function displaySavedSessionContent(
    modalName: string,
    content: Record<string, unknown>,
    title?: string
): boolean {
    const config = MODAL_CONFIGS[modalName];
    if (!config) {
        console.error(`No modal config for: ${modalName}`);
        return false;
    }

    const elements = getModalElements(config);
    if (!elements) return false;

    // Show the modal
    elements.modal.classList.remove('hidden');
    elements.modal.classList.add('flex');

    // Set title if available
    if (title && elements.title) {
        elements.title.textContent = title;
    }

    // Render content based on modal type
    const html = renderSavedContent(modalName, content);
    setModalContent(elements, html);

    return true;
}

/**
 * Render saved content for display in modal
 */
function renderSavedContent(modalName: string, content: Record<string, unknown>): string {
    switch (modalName) {
        case 'coffee':
            return renderCoffeeContent(content);
        case 'guitar':
            return renderGuitarContent(content);
        case 'poetry':
            return renderPoetryContent(content);
        case 'worldOrder':
            return renderWorldOrderContent(content);
        case 'tennis':
            return renderTennisContent(content);
        case 'history':
            return renderHistoryContent(content);
        case 'french':
            return renderFrenchContent(content);
        case 'food':
            return renderFoodContent(content);
        case 'hood':
            return renderHoodContent(content);
        case 'analytics':
            return renderAnalyticsContent(content);
        case 'exercise':
            return renderExerciseContent(content);
        default:
            return `<div class="p-4"><pre>${JSON.stringify(content, null, 2)}</pre></div>`;
    }
}

function renderCoffeeContent(data: Record<string, unknown>): string {
    const title = String(data.title || 'Coffee Lesson');
    const explanation = String(data.explanation || '');
    const takeaway = String(data.takeaway || '');

    return `
        <h4 class="font-bold text-md mb-2">${escapeHtmlString(title)}</h4>
        <p class="text-base mb-4">${escapeHtmlString(explanation)}</p>
        <div class="mt-4 pt-4 border-t border-gray-200">
            <p class="text-sm font-bold">Key Takeaway:</p>
            <p class="text-sm italic">${escapeHtmlString(takeaway)}</p>
        </div>
    `;
}

function renderGuitarContent(data: Record<string, unknown>): string {
    const title = String(data.title || '');
    const artist = String(data.artist || '');
    const key = String(data.key || '');
    const tuning = String(data.tuning || '');
    const lyricsWithChords = String(data.lyricsWithChords || '');
    const chordChanges = String(data.chordChanges || '');
    const inspiration = String(data.inspiration || '');

    return `
        <div class="space-y-4">
            <h4 class="font-bold text-md">${escapeHtmlString(title)} — ${escapeHtmlString(artist)}</h4>
            <div class="text-sm">
                <p><span class="font-semibold">Key:</span> ${escapeHtmlString(key)}</p>
                <p><span class="font-semibold">Tuning:</span> ${escapeHtmlString(tuning)}</p>
            </div>
            <div class="bg-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
                <p class="font-semibold mb-1">Lyrics & Chords (excerpt)</p>
                <pre>${escapeHtmlString(lyricsWithChords)}</pre>
            </div>
            <div class="bg-blue-50 p-3 rounded text-sm">
                <p class="font-semibold mb-1">Chord Changes</p>
                <p>${escapeHtmlString(chordChanges)}</p>
            </div>
            <div class="text-sm">
                <p class="font-semibold mb-1">Why this song rocks</p>
                <p>${escapeHtmlString(inspiration)}</p>
            </div>
        </div>
    `;
}

function renderPoetryContent(data: Record<string, unknown>): string {
    const scene = String(data.scene || '');
    const couplet = String(data.couplet || '');
    const transliteration = String(data.transliteration || '');
    const translation = String(data.translation || '');
    const aboutWriter = String(data.aboutWriter || '');
    const poet = String(data.poet || '');
    const language = String(data.language || '');

    return `
        <div class="mb-6">
            <h4 class="text-lg font-bold mb-1 text-center">Poetry in Motion</h4>
            <p class="text-center text-xs text-gray-600 mb-2">${escapeHtmlString(poet)} · ${escapeHtmlString(language)}</p>
            <div class="bg-gray-50 p-4 rounded-lg mb-4">
                <div class="text-sm leading-relaxed mb-4">${escapeHtmlString(scene)}</div>
                <div class="border-l-4 border-blue-500 pl-4 my-4">
                    <p class="text-lg font-semibold mb-2">${escapeHtmlString(couplet)}</p>
                    <p class="text-sm text-gray-600 mb-2">${escapeHtmlString(transliteration)}</p>
                    <p class="text-sm italic">"${escapeHtmlString(translation)}"</p>
                </div>
                <div class="bg-blue-50 p-3 rounded-lg mt-4">
                    <h5 class="font-bold mb-2 text-sm">About the Writer:</h5>
                    <p class="text-sm leading-relaxed">${escapeHtmlString(aboutWriter)}</p>
                </div>
            </div>
        </div>
    `;
}

function renderWorldOrderContent(data: Record<string, unknown>): string {
    const headlines = String(data.headlines || '');
    return `<div class="mb-4">${headlines.replace(/\n/g, '<br>')}</div>`;
}

function renderTennisContent(data: Record<string, unknown>): string {
    const matches = String(data.matches || '');
    return `<div class="mb-4">${matches}</div>`;
}

function renderHistoryContent(data: Record<string, unknown>): string {
    const title = String(data.title || 'History Documentary');
    const url = String(data.url || '');

    return `
        <h4 class="text-lg font-bold mb-2">
            <a href="${escapeHtmlString(url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
                ${escapeHtmlString(title)}
            </a>
        </h4>
        <p class="text-sm">
            <a href="${escapeHtmlString(url)}" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:underline">
                ${escapeHtmlString(url)}
            </a>
        </p>
    `;
}

function renderFrenchContent(data: Record<string, unknown>): string {
    const sound = String(data.sound || '');
    const words = data.words as Array<{ word: string; cue: string; meaning: string }> || [];

    return words.map((item, index) =>
        `<tr><td class="font-bold text-center">${index + 1}</td><td>${escapeHtmlString(item.word)}</td><td>${escapeHtmlString(item.cue)}</td><td>${escapeHtmlString(item.meaning)}</td><td class="text-center"><button class="play-btn" data-word="${escapeHtmlString(item.word)}">🔊</button></td></tr>`
    ).join('');
}

function renderFoodContent(data: Record<string, unknown>): string {
    const plan = String(data.plan || '');
    return plan.replace(/\n/g, '<br>');
}

function renderHoodContent(data: Record<string, unknown>): string {
    const explanation = String(data.explanation || '');
    return explanation.replace(/\n/g, '<br>');
}

function renderAnalyticsContent(data: Record<string, unknown>): string {
    const title = String(data.title || 'Analytics Lesson');
    const concept = String(data.concept || '');
    const explanation = String(data.explanation || '');
    const example = String(data.example || '');

    return `
        <h4 class="font-bold text-md mb-2">${escapeHtmlString(title)}</h4>
        ${concept ? `<p class="text-sm font-medium mb-2">${escapeHtmlString(concept)}</p>` : ''}
        <p class="text-base mb-4">${escapeHtmlString(explanation)}</p>
        ${example ? `<pre class="bg-gray-100 p-3 rounded text-sm overflow-x-auto">${escapeHtmlString(example)}</pre>` : ''}
    `;
}

function renderExerciseContent(data: Record<string, unknown>): string {
    const title = String(data.title || 'Exercise Plan');
    const exercises = Array.isArray(data.exercises) ? data.exercises : [];
    const description = String(data.description || '');

    let html = `<h4 class="font-bold text-md mb-4">${escapeHtmlString(title)}</h4>`;

    if (description) {
        html += `<p class="text-sm mb-4">${escapeHtmlString(description)}</p>`;
    }

    if (exercises.length > 0) {
        html += '<div class="space-y-3">';
        for (const ex of exercises) {
            const name = String(ex.name || ex.exercise || '');
            const sets = String(ex.sets || '');
            const reps = String(ex.reps || '');
            const notes = String(ex.notes || '');
            html += `
                <div class="border-l-2 border-gray-300 pl-3">
                    <p class="font-medium">${escapeHtmlString(name)}</p>
                    ${sets && reps ? `<p class="text-sm text-gray-600">${escapeHtmlString(sets)} sets × ${escapeHtmlString(reps)} reps</p>` : ''}
                    ${notes ? `<p class="text-xs text-gray-500">${escapeHtmlString(notes)}</p>` : ''}
                </div>
            `;
        }
        html += '</div>';
    } else {
        // Fallback: render raw content if no exercises array
        const rawContent = String(data.content || data.plan || '');
        if (rawContent) {
            html += `<div class="text-sm">${rawContent.replace(/\n/g, '<br>')}</div>`;
        }
    }

    return html;
}

/**
 * Simple HTML escaping helper
 */
function escapeHtmlString(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
