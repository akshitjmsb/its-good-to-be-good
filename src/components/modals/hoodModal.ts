import { getPhysicsContent } from "../../domains/content/service";
import { DEFAULT_USER_ID } from "../../core/default-user";
import { createSafeHtml } from "../../utils/escapeHtml";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, setModalTitle, MODAL_CONFIGS } from "./factory";

export async function showHoodModal(
    date: Date
) {
    const elements = getModalElements(MODAL_CONFIGS.hood);
    if (!elements) return;

    showModalWithLoading(elements, MODAL_CONFIGS.hood.loadingMessage);
    setModalTitle(elements, 'Under the Hood');

    try {
        const data = await getPhysicsContent(DEFAULT_USER_ID, date);

        if (!data || !data.title || !data.explanation) {
            setModalTitle(elements, 'Error');
            showModalError(elements, 'Content is not available. Please try again later.');
            return;
        }

        setModalTitle(elements, `Under the Hood: ${data.title}`);
        setModalContent(
            elements,
            createSafeHtml(data.explanation, { maxLength: 12000 })
        );
    } catch (error) {
        console.error("Error showing under the hood modal:", error);
        setModalTitle(elements, 'Error');
        showModalError(elements, 'An error occurred while fetching content.');
    }
}
