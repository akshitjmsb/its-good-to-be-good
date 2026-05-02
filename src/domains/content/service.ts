import {
  getOrGenerateDynamicContent,
  getOrGeneratePlanForDate,
} from '../../infra/ai/generators';
import {
  AnalyticsContent,
  FoodPlanText,
  GuitarPoolItem,
  PhysicsContent,
} from './types';

export async function getAnalyticsContent(
  userId: string,
  date: Date
): Promise<AnalyticsContent | null> {
  return (await getOrGenerateDynamicContent(
    userId,
    'analytics',
    date
  )) as AnalyticsContent | null;
}

export async function getPhysicsContent(
  userId: string,
  date: Date
): Promise<PhysicsContent | null> {
  return (await getOrGenerateDynamicContent(
    userId,
    'transportation-physics',
    date
  )) as PhysicsContent | null;
}

export async function getGuitarPool(
  userId: string,
  date: Date
): Promise<GuitarPoolItem[] | null> {
  return (await getOrGenerateDynamicContent(
    userId,
    'classic-rock-500',
    date
  )) as GuitarPoolItem[] | null;
}

export async function getFoodPlan(
  userId: string,
  date: Date,
  dateKey: string
): Promise<FoodPlanText> {
  return await getOrGeneratePlanForDate(userId, date, dateKey);
}

