/**
 * Weights — today's three exercise pointers, with no calendar or coaching.
 */

import { createSafeHtml, escapeHtml } from '../../utils/escapeHtml';
import {
  type Exercise,
  type WorkoutType,
  getDayPlan,
  MUSCLE_FOCUS,
} from './exercise-data';

const TYPE_LABELS: Record<WorkoutType, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  rest: 'Rest',
};

function renderExercise(exercise: Exercise): string {
  return `
    <li class="ex-pointer">
      <span class="ex-pointer__name">${createSafeHtml(exercise.name)}</span>
      <span class="ex-pointer__rx">${escapeHtml(exercise.sets)}×${escapeHtml(exercise.reps)}</span>
    </li>
  `;
}

export function renderExerciseView(container: HTMLElement, today: Date): void {
  const plan = getDayPlan(today);

  if (plan.type === 'rest') {
    container.innerHTML = `
      <section class="ex-view" aria-label="Weights">
        <p class="ex-view__type">${TYPE_LABELS[plan.type]}</p>
      </section>
    `;
    return;
  }

  const focus = MUSCLE_FOCUS[plan.type]
    .map(group => escapeHtml(group.name))
    .join(' · ');

  container.innerHTML = `
    <section class="ex-view" aria-labelledby="weights-plan-title">
      <h3 class="ex-view__type" id="weights-plan-title">${TYPE_LABELS[plan.type]}</h3>
      <p class="ex-view__focus">${focus}</p>
      <ol class="ex-pointers">
        ${(plan.exercises ?? []).map(renderExercise).join('')}
      </ol>
    </section>
  `;
}
