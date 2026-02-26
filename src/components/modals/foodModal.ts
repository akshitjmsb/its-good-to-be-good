import { getOrGeneratePlanForDate } from "../../api/perplexity";
import { ErrorHandler } from "../../utils/errorHandling";
import { DEFAULT_USER_ID } from "../../core/default-user";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, setModalTitle, MODAL_CONFIGS } from "./factory";

export async function showFoodModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive?: Date },
    keys: { today: string, tomorrow: string, archive?: string }
) {
    const elements = getModalElements(MODAL_CONFIGS.food);
    if (!elements) return;

    let date: Date, title: string, key: string;

    if (mode === 'today') {
        date = dates.active;
        title = "Today's Food";
        key = keys.today;
    } else if (mode === 'tomorrow') {
        date = dates.preview;
        title = "Tomorrow's Food";
        key = keys.tomorrow;
    } else { // archive
        if (!dates.archive || !keys.archive) {
            console.error('Archive mode requested but archive data not available');
            showModalWithLoading(elements, MODAL_CONFIGS.food.loadingMessage);
            setModalContent(elements, '<p>Archive functionality not available.</p>');
            return;
        }
        date = dates.archive;
        title = "Previous Day's Food";
        key = keys.archive;
    }

    showModalWithLoading(elements, MODAL_CONFIGS.food.loadingMessage);
    setModalTitle(elements, title);

    try {
        const plan = await getOrGeneratePlanForDate(DEFAULT_USER_ID, date, key);
        setModalContent(elements, plan.replace(/\n/g, '<br>'));
    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, `Food modal (${mode})`);
        ErrorHandler.logError(appError);
        ErrorHandler.showUserError(appError);
        showModalError(elements, 'Could not load the food plan.');
    }
}
