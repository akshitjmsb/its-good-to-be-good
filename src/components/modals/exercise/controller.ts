import { getWeeklyExercise } from '../../../domains/content/service';
import { DEFAULT_USER_ID } from '../../../core/default-user';
import { ErrorHandler } from '../../../utils/errorHandling';
import {
  MODAL_CONFIGS,
  getModalElements,
  showModalError,
  showModalWithLoading,
} from '../factory';
import { WeeklyExerciseContent } from './types';
import { getStartOfWeek, renderWeeklyExerciseContent } from './view';

export async function showExerciseModal(date: Date) {
  const elements = getModalElements(MODAL_CONFIGS.exercise);
  if (!elements) return;

  // Title is the canonical "Weekly Exercise Plan" set directly in
  // index.html, so there's no first-paint flash from a JS overwrite.
  showModalWithLoading(elements, MODAL_CONFIGS.exercise.loadingMessage);

  try {
    const startOfWeek = getStartOfWeek(date);
    const weeklyData = (await getWeeklyExercise(
      DEFAULT_USER_ID,
      startOfWeek
    )) as WeeklyExerciseContent | null;

    if (!weeklyData) {
      showModalError(
        elements,
        'Weekly exercise plan not available. Please try again later.'
      );
      return;
    }

    renderWeeklyExerciseContent(elements.content, weeklyData, date);
  } catch (error) {
    const appError = ErrorHandler.handleApiError(error, 'Exercise modal');
    ErrorHandler.logError(appError);
    ErrorHandler.showUserError(appError);
    showModalError(elements, 'Could not load the exercise plan.');
  }
}
