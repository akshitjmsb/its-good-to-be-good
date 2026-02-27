/**
 * Modal Factory
 * Provides common patterns for modal operations
 */

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

export function saveSessionContent(
    _topic: string,
    _content: unknown,
    _title?: string
): void {
    window.dispatchEvent(new CustomEvent('session-created'));
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
    elements.content.textContent = '';
    const message = document.createElement('p');
    message.textContent = loadingMessage;
    elements.content.appendChild(message);
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
    elements.content.textContent = '';
    const error = document.createElement('p');
    error.textContent = message;
    elements.content.appendChild(error);
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
