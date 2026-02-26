import { getOrGenerateDynamicContent } from "../../api/perplexity";
import { DEFAULT_USER_ID } from "../../core/default-user";
import { escapeHtml } from "../../utils/escapeHtml";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, setModalTitle, MODAL_CONFIGS } from "./factory";

export async function showHoodModal(
    date: Date
) {
    const elements = getModalElements(MODAL_CONFIGS.hood);
    if (!elements) return;

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
