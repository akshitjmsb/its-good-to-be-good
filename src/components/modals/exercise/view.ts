import { createSafeHtml, escapeHtml } from '../../../utils/escapeHtml';
import { ExerciseDay, ExerciseItem, WeeklyExerciseContent } from './types';

const WEEK_DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function getStartOfWeek(date: Date): Date {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day;
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

function dayType(day: ExerciseDay | undefined): string {
  return (day?.type ?? '').toLowerCase();
}

function typeLabel(type: string): string {
  if (!type) return '';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function renderWeeklyExerciseContent(
  container: HTMLElement,
  weeklyData: WeeklyExerciseContent,
  currentDate: Date
) {
  // Drop any handler from a prior open before we rebuild the DOM. Together
  // with the per-mount replacement inside initializeCardNavigation, this
  // guarantees at most one document-level keydown listener at a time.
  teardownCardKeydownHandler();

  const dayOfWeek = currentDate.getDay();
  const currentDay = WEEK_DAYS[dayOfWeek];
  const currentDayData = weeklyData[currentDay];
  const currentType = dayType(currentDayData);

  container.innerHTML = `
    <div class="exercise-container">
      <div class="exercise-header">
        <div class="current-day-badge ${currentType}-badge">
          ${escapeHtml(typeLabel(currentType))}
        </div>
      </div>
      <div class="day-selector">
        ${WEEK_DAYS.map((day, index) => {
          const data = weeklyData[day];
          const isActive = day === currentDay;
          const t = dayType(data);
          return `
            <button class="day-button ${isActive ? 'active' : ''}" data-day="${day}">
              <span class="day-name">${DAY_LABELS[index]}</span>
              <span class="workout-type">${escapeHtml(typeLabel(t))}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="exercise-content">
        ${renderDayContent(currentDayData)}
      </div>
    </div>
  `;

  initializeDayNavigation(container, weeklyData);
  if (currentType !== 'rest') {
    initializeCardNavigation(container, currentDayData);
  }
}

function renderDayContent(dayData: ExerciseDay): string {
  if (dayType(dayData) === 'rest') return renderRestDayContent(dayData);
  return renderWorkoutCards(dayData);
}

function renderRestDayContent(dayData: ExerciseDay): string {
  const activities = dayData.activities ?? [];
  return `
    <div class="rest-day-content">
      <div class="rest-title">Rest Day</div>
      <div class="rest-message">Take it easy and focus on recovery</div>
      ${
        activities.length
          ? `
        <div class="rest-suggestions">
          <h4>Suggested Activities</h4>
          <ul>
            ${activities.map(activity => `<li>${createSafeHtml(activity)}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
      ${dayData.notes ? `<p class="rest-notes">${createSafeHtml(dayData.notes)}</p>` : ''}
    </div>
  `;
}

function renderWorkoutCards(workoutData: ExerciseDay): string {
  const exercises = workoutData?.exercises ?? [];
  if (!exercises.length) {
    return '<p class="exercise-empty">No exercises planned for today.</p>';
  }

  return `
    <div class="workout-cards-container">
      <div class="exercise-counter">Exercise 1 of ${exercises.length}</div>
      <div class="cards-wrapper">
        ${exercises.map((exercise, index) => renderExerciseCard(exercise, index + 1)).join('')}
      </div>
      ${
        exercises.length > 1
          ? `
        <div class="card-indicators" role="tablist">
          ${exercises
            .map(
              (_, index) =>
                `<button type="button" class="indicator ${index === 0 ? 'active' : ''}" data-card-index="${index}" aria-label="Show exercise ${index + 1}"></button>`
            )
            .join('')}
        </div>
      `
          : ''
      }
      ${
        workoutData.notes
          ? `<p class="workout-notes">${createSafeHtml(workoutData.notes)}</p>`
          : ''
      }
    </div>
  `;
}

function renderExerciseCard(exercise: ExerciseItem, number: number): string {
  const exerciseName = exercise.name || 'Exercise';
  const muscleGroups = exercise.muscleGroups || exercise.target || 'Full body';
  const sets = exercise.sets || '3-4';
  const reps = exercise.reps || '8-12';
  const rest = exercise.rest || '90s';
  const instructions = exercise.instructions ?? '';
  const tips = exercise.tips ?? '';

  return `
    <article class="exercise-card" data-exercise="${number}">
      <div class="card-content">
        <h4 class="exercise-title">${createSafeHtml(exerciseName)}</h4>
        <p class="muscle-groups">${createSafeHtml(muscleGroups)}</p>
        <div class="exercise-details">
          <span class="sets-reps">${escapeHtml(String(sets))} sets × ${escapeHtml(String(reps))} reps</span>
          <span class="rest-time">${escapeHtml(String(rest))} rest</span>
        </div>
        ${
          instructions
            ? `
          <section class="exercise-section">
            <h5 class="exercise-section__heading">Form</h5>
            <p class="exercise-section__body">${createSafeHtml(instructions)}</p>
          </section>
        `
            : ''
        }
        ${
          tips
            ? `
          <section class="exercise-section">
            <h5 class="exercise-section__heading">Tip</h5>
            <p class="exercise-section__body">${createSafeHtml(tips)}</p>
          </section>
        `
            : ''
        }
      </div>
    </article>
  `;
}

function initializeDayNavigation(
  container: HTMLElement,
  weeklyData: WeeklyExerciseContent
) {
  const dayButtons = container.querySelectorAll<HTMLButtonElement>('.day-button');
  const exerciseContent = container.querySelector<HTMLElement>('.exercise-content');
  const currentDayBadge = container.querySelector<HTMLElement>('.current-day-badge');
  if (!dayButtons.length || !exerciseContent || !currentDayBadge) return;

  dayButtons.forEach(button => {
    button.addEventListener('click', () => {
      const selectedDay = button.getAttribute('data-day');
      if (!selectedDay || !weeklyData[selectedDay]) return;

      dayButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const data = weeklyData[selectedDay];
      const t = dayType(data);
      currentDayBadge.className = `current-day-badge ${t}-badge`;
      currentDayBadge.textContent = typeLabel(t);

      exerciseContent.innerHTML = renderDayContent(data);

      if (t !== 'rest') {
        initializeCardNavigation(container, data);
      } else {
        // Day-switch into a rest day: tear down any keydown listener from the
        // previous workout day so it doesn't fire on now-detached cards.
        teardownCardKeydownHandler();
      }
    });
  });
}

// One global keydown handler at a time. Re-mounting the carousel (day switch
// or modal close) replaces it, preventing the multi-listener leak the
// previous implementation accumulated on every day click.
let activeKeydownHandler: ((event: KeyboardEvent) => void) | null = null;

function teardownCardKeydownHandler(): void {
  if (activeKeydownHandler) {
    document.removeEventListener('keydown', activeKeydownHandler);
    activeKeydownHandler = null;
  }
}

function initializeCardNavigation(
  container: HTMLElement,
  workoutData: ExerciseDay
) {
  teardownCardKeydownHandler();

  const exercises = workoutData?.exercises ?? [];
  if (exercises.length <= 1) return;

  const cards = container.querySelectorAll<HTMLElement>('.exercise-card');
  const indicators = container.querySelectorAll<HTMLElement>('.indicator');
  const counter = container.querySelector<HTMLElement>('.exercise-counter');
  const cardsWrapper = container.querySelector<HTMLElement>('.cards-wrapper');
  if (!cards.length || !cardsWrapper || !counter) return;

  let currentIndex = 0;
  const total = exercises.length;
  cards[0].classList.add('active');
  indicators[0]?.classList.add('active');

  function goToCard(index: number): void {
    if (index < 0 || index >= total || index === currentIndex) return;

    cards[currentIndex].classList.remove('active');
    cards[currentIndex].classList.add('prev');
    cards[index].classList.remove('prev');
    cards[index].classList.add('active');

    indicators[currentIndex]?.classList.remove('active');
    indicators[index]?.classList.add('active');
    counter!.textContent = `Exercise ${index + 1} of ${total}`;
    currentIndex = index;

    setTimeout(() => {
      cards.forEach(card => card.classList.remove('prev'));
    }, 300);
  }

  function nextCard() {
    if (currentIndex < total - 1) goToCard(currentIndex + 1);
  }
  function prevCard() {
    if (currentIndex > 0) goToCard(currentIndex - 1);
  }

  // Indicator clicks.
  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => goToCard(index));
  });

  // Touch swipe — only consume the gesture once horizontal motion clearly
  // dominates, so vertical scrolling inside the modal still works.
  let startX = 0;
  let startY = 0;
  let axis: 'horizontal' | 'vertical' | 'unknown' = 'unknown';
  const AXIS_THRESHOLD = 8;
  const SWIPE_THRESHOLD = 50;

  cardsWrapper.addEventListener('touchstart', (event: TouchEvent) => {
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    axis = 'unknown';
  }, { passive: true });

  cardsWrapper.addEventListener(
    'touchmove',
    (event: TouchEvent) => {
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (axis === 'unknown') {
        if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }
      if (axis === 'horizontal') event.preventDefault();
    },
    { passive: false }
  );

  cardsWrapper.addEventListener('touchend', (event: TouchEvent) => {
    if (axis !== 'horizontal') return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    if (Math.abs(dx) <= SWIPE_THRESHOLD) return;
    if (dx < 0) nextCard();
    else prevCard();
  });

  // Arrow-key navigation. Single registration (teardown above clears any
  // prior handler) so day-switching no longer accumulates listeners.
  const keyHandler = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') prevCard();
    else if (event.key === 'ArrowRight') nextCard();
  };
  document.addEventListener('keydown', keyHandler);
  activeKeydownHandler = keyHandler;
}
