import { getFoodPlan } from "../../domains/content/service";
import { ErrorHandler } from "../../utils/errorHandling";
import { createSafeHtml } from "../../utils/escapeHtml";
import { DEFAULT_USER_ID } from "../../core/default-user";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, setModalTitle, MODAL_CONFIGS } from "./factory";

export async function showFoodModal(
    date: Date,
    key: string
) {
    const elements = getModalElements(MODAL_CONFIGS.food);
    if (!elements) return;

    showModalWithLoading(elements, MODAL_CONFIGS.food.loadingMessage);
    setModalTitle(elements, "Today's Food");

    try {
        const plan = await getFoodPlan(DEFAULT_USER_ID, date, key);
        setModalContent(elements, createSafeHtml(plan, { maxLength: 8000 }));
    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, 'Food modal');
        ErrorHandler.logError(appError);
        ErrorHandler.showUserError(appError);
        showModalError(elements, 'Could not load the food plan.');
    }
}
