import { getFoodPlan } from '../../../domains/content/service';
import { ErrorHandler } from '../../../utils/errorHandling';
import { DEFAULT_USER_ID } from '../../../core/default-user';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalContent,
  setModalTitle,
  showModalError,
  showModalWithLoading,
} from '../factory';
import { renderFoodPlan } from './view';

export async function showFoodModal(date: Date, key: string) {
  const elements = getModalElements(MODAL_CONFIGS.food);
  if (!elements) return;

  showModalWithLoading(elements, MODAL_CONFIGS.food.loadingMessage);
  setModalTitle(elements, "Today's Food");

  try {
    const planText = await getFoodPlan(DEFAULT_USER_ID, date, key);
    setModalContent(elements, renderFoodPlan({ text: planText }));
  } catch (error) {
    const appError = ErrorHandler.handleApiError(error, 'Food modal');
    ErrorHandler.logError(appError);
    ErrorHandler.showUserError(appError);
    showModalError(elements, 'Could not load the food plan.');
  }
}
