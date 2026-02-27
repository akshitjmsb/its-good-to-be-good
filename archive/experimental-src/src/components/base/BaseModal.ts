/**
 * Base modal class to reduce code duplication across modal components
 */

export interface ModalConfig {
    modalId: string;
    titleId?: string;
    contentId?: string;
    closeButtonClass?: string;
}

export abstract class BaseModal {
    protected modal: HTMLElement | null;
    protected titleElement: HTMLElement | null;
    protected contentElement: HTMLElement | null;
    protected config: ModalConfig;

    constructor(config: ModalConfig) {
        this.config = config;
        this.modal = document.getElementById(config.modalId);
        this.titleElement = config.titleId ? document.getElementById(config.titleId) : null;
        this.contentElement = config.contentId ? document.getElementById(config.contentId) : null;
    }

    /**
     * Shows the modal
     */
    show(): void {
        if (!this.modal) {
            console.error(`Modal with ID ${this.config.modalId} not found`);
            return;
        }

        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        this.onShow();
    }

    /**
     * Hides the modal
     */
    hide(): void {
        if (!this.modal) return;

        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
        this.onHide();
    }

    /**
     * Sets the modal title
     */
    setTitle(title: string): void {
        if (this.titleElement) {
            this.titleElement.textContent = title;
        }
    }

    /**
     * Sets the modal content
     */
    setContent(content: string): void {
        if (this.contentElement) {
            this.contentElement.innerHTML = content;
        }
    }

    /**
     * Shows loading state
     */
    showLoading(message: string = 'Loading...'): void {
        this.setContent(`<p>${message}</p>`);
    }

    /**
     * Shows error state
     */
    showError(message: string = 'An error occurred'): void {
        this.setContent(`<p class="text-red-500">${message}</p>`);
    }

    /**
     * Checks if modal is currently visible
     */
    isVisible(): boolean {
        return this.modal ? this.modal.classList.contains('flex') : false;
    }

    /**
     * Called when modal is shown - override in subclasses
     */
    protected onShow(): void {
        // Override in subclasses
    }

    /**
     * Called when modal is hidden - override in subclasses
     */
    protected onHide(): void {
        // Override in subclasses
    }

    /**
     * Sets up event listeners for modal close buttons
     */
    protected setupCloseListeners(): void {
        if (!this.modal) return;

        const closeButtons = this.modal.querySelectorAll(`.${this.config.closeButtonClass || 'modal-close-btn'}`);
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.hide());
        });

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }
}

/**
 * Utility function to create a simple modal instance
 */
export function createSimpleModal(modalId: string, titleId?: string, contentId?: string): BaseModal {
    return new (class extends BaseModal {
        constructor() {
            super({ modalId, titleId, contentId });
            this.setupCloseListeners();
        }
    })();
}
