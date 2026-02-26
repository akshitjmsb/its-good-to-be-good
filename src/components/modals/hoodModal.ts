import { getOrGenerateDynamicContent } from "../../api/perplexity";
import { DEFAULT_USER_ID } from "../../core/default-user";
import { escapeHtml } from "../../utils/escapeHtml";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, setModalTitle, MODAL_CONFIGS } from "./factory";

export async function showHoodModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive?: Date }
) {
    const elements = getModalElements(MODAL_CONFIGS.hood);
    if (!elements) return;

    const date = mode === 'today' ? dates.active : mode === 'tomorrow' ? dates.preview : dates.archive;

    if (mode === 'archive' && !dates.archive) {
        console.error('Archive mode requested but archive data not available');
        setModalContent(elements, '<div class="p-4">Archive functionality not available.</div>');
        return;
    }

    showModalWithLoading(elements, MODAL_CONFIGS.hood.loadingMessage);
    setModalTitle(elements, 'Under the Hood');

    try {
        const data = await getOrGenerateDynamicContent(DEFAULT_USER_ID, 'transportation-physics', date);

        if (!data || !data.title || !data.explanation) {
            setModalTitle(elements, 'Error');
            showModalError(elements, 'Content is not available. Please try again later.');
            return;
        }

        setModalTitle(elements, `Under the Hood: ${escapeHtml(data.title)}`);
        setModalContent(elements, data.explanation.replace(/\n/g, '<br>'));
    } catch (error) {
        console.error("Error showing under the hood modal:", error);
        setModalTitle(elements, 'Error');
        showModalError(elements, 'An error occurred while fetching content.');
    }
}
