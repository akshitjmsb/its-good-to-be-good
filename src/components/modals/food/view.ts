import { createSafeHtml } from '../../../utils/escapeHtml';
import { FoodPlanContent } from './types';

export function renderFoodPlan(plan: FoodPlanContent): string {
  return createSafeHtml(plan.text, { maxLength: 8000 });
}
