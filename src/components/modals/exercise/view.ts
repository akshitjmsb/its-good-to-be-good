import { createSafeHtml } from '../../../utils/escapeHtml';
import { ExerciseDay, ExerciseItem, WeeklyExerciseContent } from './types';

export function getStartOfWeek(date: Date): Date {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day;
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

export function renderWeeklyExerciseContent(
  container: HTMLElement,
  weeklyData: WeeklyExerciseContent,
  currentDate: Date
) {
  const dayOfWeek = currentDate.getDay();
  const weekDays = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const currentDay = weekDays[dayOfWeek];
  const currentDayData = weeklyData[currentDay];

  container.innerHTML = `
    <div class="exercise-container">
      <div class="exercise-header">
        <div class="current-day-badge ${currentDayData.type}-badge">
          ${currentDayData.type.charAt(0).toUpperCase() + currentDayData.type.slice(1)}
        </div>
      </div>
      <div class="day-selector">
        ${weekDays
          .map((day, index) => {
            const dayData = weeklyData[day];
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
              index
            ];
            const isActive = day === currentDay;
            return `
              <button class="day-button ${isActive ? 'active' : ''}" data-day="${day}">
                <span class="day-name">${dayName}</span>
                <span class="workout-type">${getWorkoutTypeAbbreviation(dayData.type)}</span>
              </button>
            `;
          })
          .join('')}
      </div>
      <div class="exercise-content">
        ${renderDayContent(currentDayData, currentDay)}
      </div>
    </div>
  `;

  initializeDayNavigation(weeklyData);
}

function getWorkoutTypeAbbreviation(workoutType: string): string {
  const abbreviations: Record<string, string> = {
    push: 'Push',
    pull: 'Pull',
    legs: 'Legs',
    upper: 'Upper',
    rest: 'Rest',
  };
  return abbreviations[workoutType] || workoutType;
}

function renderDayContent(dayData: ExerciseDay, _dayName: string): string {
  if (dayData.type === 'rest') {
    return renderRestDayContent(dayData);
  }
  return renderWorkoutCards(dayData);
}

function renderRestDayContent(dayData: ExerciseDay): string {
  return `
    <div class="rest-day-content">
      <div class="rest-title">Rest Day</div>
      <div class="rest-message">Take it easy and focus on recovery</div>
      <div class="rest-suggestions">
        <h4>Suggested Activities:</h4>
        <ul>
          ${(dayData.activities || [])
            .map((activity: string) => `<li>${createSafeHtml(activity)}</li>`)
            .join('')}
        </ul>
      </div>
      ${dayData.notes ? `<p class="rest-notes">${createSafeHtml(dayData.notes)}</p>` : ''}
    </div>
  `;
}

function renderWorkoutCards(workoutData: ExerciseDay): string {
  if (!workoutData) {
    return '<p>No workout data available for today.</p>';
  }

  const exercises = workoutData.exercises ?? [];
  if (!exercises.length) {
    return '<p>No exercises planned for today.</p>';
  }

  return `
    <div class="workout-cards-container">
      <div class="exercise-counter">Exercise 1 of ${exercises.length}</div>
      <div class="cards-wrapper">
        ${exercises
          .map((exercise: ExerciseItem, index: number) =>
            renderExerciseCard(exercise, index + 1)
          )
          .join('')}
      </div>
      <div class="card-indicators">
        ${exercises
          .map(
            (_: ExerciseItem, index: number) =>
              `<span class="indicator ${index === 0 ? 'active' : ''}"></span>`
          )
          .join('')}
      </div>
    </div>
  `;
}

function initializeDayNavigation(weeklyData: WeeklyExerciseContent) {
  const dayButtons = document.querySelectorAll('.day-button');
  const exerciseContent = document.querySelector('.exercise-content');
  const currentDayBadge = document.querySelector('.current-day-badge');

  if (!dayButtons.length || !exerciseContent || !currentDayBadge) return;

  dayButtons.forEach(button => {
    button.addEventListener('click', () => {
      const selectedDay = button.getAttribute('data-day');
      if (!selectedDay || !weeklyData[selectedDay]) return;

      dayButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const dayData = weeklyData[selectedDay];
      currentDayBadge.className = `current-day-badge ${dayData.type}-badge`;
      currentDayBadge.textContent = `${dayData.type.charAt(0).toUpperCase() + dayData.type.slice(1)}`;

      exerciseContent.innerHTML = renderDayContent(dayData, selectedDay);

      if (dayData.type !== 'rest' && dayData.exercises) {
        initializeCardNavigation(dayData);
      }
    });
  });
}

function renderExerciseCard(exercise: ExerciseItem, number: number): string {
  const exerciseName = exercise.name || 'Exercise';
  const muscleGroups = exercise.muscleGroups || exercise.target || 'Full Body';
  const sets = exercise.sets || '3-4';
  const reps = exercise.reps || '8-12';
  const rest = exercise.rest || '90s';
  const muscleWikiUrl = getMuscleWikiUrl(exerciseName);

  return `
    <div class="exercise-card" data-exercise="${number}">
      <div class="card-content">
        <h4 class="exercise-title">${createSafeHtml(exerciseName)}</h4>
        <p class="muscle-groups">${createSafeHtml(muscleGroups)}</p>
        <div class="exercise-details">
          <span class="sets-reps">${sets} sets × ${reps} reps</span>
          <span class="rest-time">${rest} rest</span>
        </div>
        <a href="${muscleWikiUrl}" target="_blank" class="musclewiki-link">MuscleWiki</a>
      </div>
    </div>
  `;
}

function getMuscleWikiUrl(exerciseName: string): string {
  const exerciseMap: Record<string, string> = {
    'bench press': 'bench-press',
    squat: 'squat',
    deadlift: 'deadlift',
    'overhead press': 'overhead-press',
    'barbell row': 'bent-over-row',
    'pull-up': 'pull-up',
    'push-up': 'push-up',
    'dumbbell press': 'dumbbell-press',
    'dumbbell row': 'dumbbell-row',
    'lateral raise': 'lateral-raise',
    'bicep curl': 'bicep-curl',
    'tricep dip': 'tricep-dip',
    'leg press': 'leg-press',
    lunges: 'lunges',
    'calf raise': 'calf-raise',
    plank: 'plank',
    'sit-up': 'sit-up',
    crunch: 'crunch',
    'mountain climber': 'mountain-climber',
    burpee: 'burpee',
  };

  const normalizedName = exerciseName.toLowerCase().trim();
  const muscleWikiSlug =
    exerciseMap[normalizedName] || normalizedName.replace(/\s+/g, '-');

  return `https://musclewiki.com/exercises/${muscleWikiSlug}`;
}

function initializeCardNavigation(workoutData: ExerciseDay) {
  if (!workoutData.exercises || workoutData.exercises.length <= 1) return;

  const cards = document.querySelectorAll('.exercise-card');
  const indicators = document.querySelectorAll('.indicator');
  const counter = document.querySelector('.exercise-counter');
  if (cards.length === 0 || indicators.length === 0 || !counter) return;
  const counterEl = counter as HTMLElement;

  let currentIndex = 0;
  const totalExercises = workoutData.exercises.length;
  cards[0].classList.add('active');
  indicators[0].classList.add('active');

  let startX = 0;
  let startY = 0;
  let isDragging = false;

  const cardsWrapper = document.querySelector('.cards-wrapper');
  if (!cardsWrapper) return;

  cardsWrapper.addEventListener('touchstart', (e: Event) => {
    const touchEvent = e as TouchEvent;
    startX = touchEvent.touches[0].clientX;
    startY = touchEvent.touches[0].clientY;
    isDragging = true;
  });

  cardsWrapper.addEventListener('touchmove', e => {
    if (!isDragging) return;
    e.preventDefault();
  });

  cardsWrapper.addEventListener('touchend', (e: Event) => {
    if (!isDragging) return;
    isDragging = false;

    const touchEvent = e as TouchEvent;
    const endX = touchEvent.changedTouches[0].clientX;
    const endY = touchEvent.changedTouches[0].clientY;
    const diffX = startX - endX;
    const diffY = startY - endY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        nextCard();
      } else {
        prevCard();
      }
    }
  });

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      goToCard(index);
    });
  });

  function nextCard() {
    if (currentIndex < totalExercises - 1) goToCard(currentIndex + 1);
  }

  function prevCard() {
    if (currentIndex > 0) goToCard(currentIndex - 1);
  }

  function goToCard(index: number) {
    if (index < 0 || index >= totalExercises) return;

    cards[currentIndex].classList.remove('active');
    cards[currentIndex].classList.add('prev');
    cards[index].classList.remove('prev');
    cards[index].classList.add('active');

    indicators[currentIndex].classList.remove('active');
    indicators[index].classList.add('active');
    counterEl.textContent = `Exercise ${index + 1} of ${totalExercises}`;
    currentIndex = index;

    setTimeout(() => {
      cards.forEach(card => card.classList.remove('prev'));
    }, 300);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') prevCard();
    if (e.key === 'ArrowRight') nextCard();
  });
}
