import { getOrGenerateDynamicContent } from '../../infra/ai/generators';
import { AnalyticsContent, PhysicsContent } from './types';

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
