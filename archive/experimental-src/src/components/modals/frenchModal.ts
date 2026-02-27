import {
    getModalElements,
    showModalWithLoading,
    setModalContent,
    setModalTitle,
    MODAL_CONFIGS
} from "./factory";

export async function showFrenchModal(
    _mode: 'today' | 'tomorrow' | 'archive',
    _dates: { active: Date, preview: Date, archive?: Date }
) {
    const elements = getModalElements(MODAL_CONFIGS.french);
    if (!elements) return;

    showModalWithLoading(elements, MODAL_CONFIGS.french.loadingMessage);
    setModalTitle(elements, 'French');
    setModalContent(
        elements,
        `<div class="p-4 text-sm">
            French lessons now run in the dedicated page.
            <br><br>
            <a class="text-blue-600 underline" href="french.html">Open French translator</a>
        </div>`
    );
}
