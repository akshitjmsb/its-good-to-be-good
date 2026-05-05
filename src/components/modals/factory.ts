/**
 * Modal Factory
 * Provides common patterns for modal operations
 */

interface ModalElements {
    modal: HTMLElement;
    content: HTMLElement;
    title?: HTMLElement;
}

interface ModalConfig {
    modalId: string;
    contentId: string;
    titleId?: string;
    loadingMessage?: string;
}

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

export function showModalError(
    elements: ModalElements,
    message: string = 'An error occurred. Please try again.'
): void {
    elements.content.textContent = '';
    const error = document.createElement('p');
    error.textContent = message;
    elements.content.appendChild(error);
}

export function setModalContent(elements: ModalElements, html: string): void {
    elements.content.innerHTML = html;
}

export function setModalTitle(elements: ModalElements, title: string): void {
    if (elements.title) {
        elements.title.textContent = title;
    }
}

/**
 * Modal configuration registry — single source of truth for DOM ids and
 * loading copy across modal handlers.
 */
export const MODAL_CONFIGS: Record<string, ModalConfig> = {
    coffee: {
        modalId: 'coffee-modal',
        contentId: 'coffee-content'
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
