import { generateWeeklyExerciseContent } from "../../api/perplexity";
import { ErrorHandler } from "../../utils/errorHandling";
import { DEFAULT_USER_ID } from "../../core/default-user";
import { createSafeHtml } from "../../utils/escapeHtml";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, setModalTitle, MODAL_CONFIGS } from "./factory";

// Exercise modal with 4-day workout schedule and swipable cards

export async function showExerciseModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive?: Date }
) {
    const elements = getModalElements(MODAL_CONFIGS.exercise);
    if (!elements) return;

    const date = mode === 'today' ? dates.active : mode === 'tomorrow' ? dates.preview : dates.archive;

    if (mode === 'archive' && !dates.archive) {
        console.error('Archive mode requested but archive data not available');
        showModalWithLoading(elements, MODAL_CONFIGS.exercise.loadingMessage);
        setModalContent(elements, '<div class="p-4">Archive functionality not available.</div>');
        return;
    }

    showModalWithLoading(elements, MODAL_CONFIGS.exercise.loadingMessage);
    setModalTitle(elements, "Weekly Exercise Plan");

    try {
        // Get the start of the week (Sunday) for the given date
        const startOfWeek = getStartOfWeek(date!);
        const weeklyData = await generateWeeklyExerciseContent(DEFAULT_USER_ID, startOfWeek);

        if (!weeklyData) {
            showModalError(elements, 'Weekly exercise plan not available. Please try again later.');
            return;
        }

        renderWeeklyExerciseContent(elements.content, weeklyData, date!);

    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, `Exercise modal (${mode})`);
        ErrorHandler.logError(appError);
        ErrorHandler.showUserError(appError);
        showModalError(elements, 'Could not load the exercise plan.');
    }
}


function getStartOfWeek(date: Date): Date {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday = 0
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

function renderWeeklyExerciseContent(container: HTMLElement, weeklyData: any, currentDate: Date) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
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
                ${weekDays.map((day, index) => {
                    const dayData = weeklyData[day];
                    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index];
                    const isActive = day === currentDay;
                    return `
                        <button class="day-button ${isActive ? 'active' : ''}" data-day="${day}">
                            <span class="day-name">${dayName}</span>
                            <span class="workout-type">${getWorkoutTypeAbbreviation(dayData.type)}</span>
                        </button>
                    `;
                }).join('')}
            </div>

            <div class="exercise-content">
                ${renderDayContent(currentDayData, currentDay)}
            </div>
        </div>
    `;

    // Initialize day navigation
    initializeDayNavigation(weeklyData);
}

function getWorkoutTypeAbbreviation(workoutType: string): string {
    const abbreviations: { [key: string]: string } = {
        'push': 'Push',
        'pull': 'Pull',
        'legs': 'Legs',
        'upper': 'Upper',
        'rest': 'Rest'
    };
    return abbreviations[workoutType] || workoutType;
}

function renderDayContent(dayData: any, dayName: string): string {
    if (dayData.type === 'rest') {
        return renderRestDayContent(dayData);
    } else {
        return renderWorkoutCards(dayData);
    }
}

function renderRestDayContent(dayData: any): string {
    return `
        <div class="rest-day-content">
            <div class="rest-title">Rest Day</div>
            <div class="rest-message">Take it easy and focus on recovery</div>
            <div class="rest-suggestions">
                <h4>Suggested Activities:</h4>
                <ul>
                    ${dayData.activities.map((activity: string) => `<li>${createSafeHtml(activity)}</li>`).join('')}
                </ul>
            </div>
            ${dayData.notes ? `<p class="rest-notes">${createSafeHtml(dayData.notes)}</p>` : ''}
        </div>
    `;
}

function renderWorkoutCards(workoutData: any): string {
    if (!workoutData) {
        return '<p>No workout data available for today.</p>';
    }

    const hasExercises = workoutData.exercises && workoutData.exercises.length > 0;

    if (!hasExercises) {
        return '<p>No exercises planned for today.</p>';
    }

    return `
        <div class="workout-cards-container">
            <div class="exercise-counter">Exercise 1 of ${workoutData.exercises.length}</div>
            <div class="cards-wrapper">
                ${workoutData.exercises.map((exercise: any, index: number) =>
                    renderExerciseCard(exercise, index + 1, workoutData.exercises.length)
                ).join('')}
            </div>
            <div class="card-indicators">
                ${workoutData.exercises.map((_: any, index: number) =>
                    `<span class="indicator ${index === 0 ? 'active' : ''}"></span>`
                ).join('')}
            </div>
        </div>
    `;
}

function initializeDayNavigation(weeklyData: any) {
    const dayButtons = document.querySelectorAll('.day-button');
    const exerciseContent = document.querySelector('.exercise-content');
    const currentDayBadge = document.querySelector('.current-day-badge');

    if (!dayButtons.length || !exerciseContent || !currentDayBadge) {
        return;
    }

    dayButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const selectedDay = button.getAttribute('data-day');
            if (!selectedDay || !weeklyData[selectedDay]) return;

            // Update active button
            dayButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update current day badge
            const dayData = weeklyData[selectedDay];
            currentDayBadge.className = `current-day-badge ${dayData.type}-badge`;
            currentDayBadge.textContent = `${dayData.type.charAt(0).toUpperCase() + dayData.type.slice(1)}`;

            // Update content
            const newContent = renderDayContent(dayData, selectedDay);
            exerciseContent.innerHTML = newContent;

            // Initialize card navigation if it's a workout day
            if (dayData.type !== 'rest' && dayData.exercises) {
                initializeCardNavigation(dayData);
            }
        });
    });
}

function renderExerciseCard(exercise: any, number: number, total: number): string {
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
                <a href="${muscleWikiUrl}" target="_blank" class="musclewiki-link">
                    MuscleWiki
                </a>
            </div>
        </div>
    `;
}


function getMuscleWikiUrl(exerciseName: string): string {
    // Convert exercise name to MuscleWiki format
    const exerciseMap: { [key: string]: string } = {
        'bench press': 'bench-press',
        'squat': 'squat',
        'deadlift': 'deadlift',
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
        'lunges': 'lunges',
        'calf raise': 'calf-raise',
        'plank': 'plank',
        'sit-up': 'sit-up',
        'crunch': 'crunch',
        'mountain climber': 'mountain-climber',
        'burpee': 'burpee'
    };

    const normalizedName = exerciseName.toLowerCase().trim();
    const muscleWikiSlug = exerciseMap[normalizedName] || normalizedName.replace(/\s+/g, '-');

    return `https://musclewiki.com/exercises/${muscleWikiSlug}`;
}

function initializeCardNavigation(workoutData: any) {
    if (!workoutData || !workoutData.exercises || workoutData.exercises.length <= 1) {
        return;
    }

    const cards = document.querySelectorAll('.exercise-card');
    const indicators = document.querySelectorAll('.indicator');
    const counter = document.querySelector('.exercise-counter');

    if (cards.length === 0 || indicators.length === 0 || !counter) {
        return;
    }

    let currentIndex = 0;
    const totalExercises = workoutData.exercises.length;

    // Show first card
    cards[0].classList.add('active');
    indicators[0].classList.add('active');

    // Add touch/swipe support
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const cardsWrapper = document.querySelector('.cards-wrapper');
    if (!cardsWrapper) return;

    cardsWrapper.addEventListener('touchstart', (e: TouchEvent) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
    });

    cardsWrapper.addEventListener('touchmove', (e: TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault();
    });

    cardsWrapper.addEventListener('touchend', (e: TouchEvent) => {
        if (!isDragging) return;
        isDragging = false;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;

        // Only trigger if horizontal swipe is more significant than vertical
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0) {
                // Swipe left - next card
                nextCard();
            } else {
                // Swipe right - previous card
                prevCard();
            }
        }
    });

    // Add click support for indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            goToCard(index);
        });
    });

    function nextCard() {
        if (currentIndex < totalExercises - 1) {
            goToCard(currentIndex + 1);
        }
    }

    function prevCard() {
        if (currentIndex > 0) {
            goToCard(currentIndex - 1);
        }
    }

    function goToCard(index: number) {
        if (index < 0 || index >= totalExercises) return;

        // Update current card
        cards[currentIndex].classList.remove('active');
        cards[currentIndex].classList.add('prev');

        // Update new card
        cards[index].classList.remove('prev');
        cards[index].classList.add('active');

        // Update indicators
        indicators[currentIndex].classList.remove('active');
        indicators[index].classList.add('active');

        // Update counter
        counter.textContent = `Exercise ${index + 1} of ${totalExercises}`;

        currentIndex = index;

        // Clean up prev classes after animation
        setTimeout(() => {
            cards.forEach(card => card.classList.remove('prev'));
        }, 300);
    }

    // Add keyboard support
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            prevCard();
        } else if (e.key === 'ArrowRight') {
            nextCard();
        }
    });
}
