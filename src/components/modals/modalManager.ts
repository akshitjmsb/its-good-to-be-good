import { showFoodModal } from './foodModal';
import { showAnalyticsModal, cleanupAnalyticsEventListeners } from './analyticsModal';
import { showHoodModal } from './hoodModal';
import { showExerciseModal } from './exerciseModal';
import { fetchAndShowWorldOrder } from './worldOrderModal';
import { fetchAndShowTennisMatches } from './tennisModal';
import { fetchAndShowCoffeeTip } from './coffeeModal';
import { fetchAndShowGuitarTab } from './guitarModal';
import { fetchAndShowPoetry } from './poetryModal';

type ModalDependencies = {
    dates: {
        active: Date;
        preview: Date;
    };
    keys: {
        today: string;
        tomorrow: string;
    };
};

export function initializeModalManager(
    appContainer: HTMLElement,
    dependencies: ModalDependencies
) {
    const { dates, keys } = dependencies;

    appContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Modal Closers
        const activeModal = target.closest('.fixed.flex');
        if (activeModal && (target.closest('.modal-close-btn') || target === activeModal)) {
            activeModal.classList.add('hidden');
            activeModal.classList.remove('flex');

            if (activeModal.id === 'analytics-engineer-modal') {
                cleanupAnalyticsEventListeners();
            }
            return;
        }

        // Topic card handlers - directly open modals with fresh content
        if (target.closest('#food-clickable-day')) {
            return showFoodModal('today', dates, keys);
        }
        if (target.closest('#frenchy-clickable-day')) {
            window.location.href = 'french.html';
            return;
        }
        if (target.closest('#analytics-clickable-day')) {
            return showAnalyticsModal('today', dates);
        }
        if (target.closest('#hood-clickable-day')) {
            return showHoodModal('today', dates);
        }
        if (target.closest('#exercise-clickable-day')) {
            return showExerciseModal('today', dates);
        }
        if (target.closest('#geopolitics-clickable')) {
            return fetchAndShowWorldOrder();
        }
        if (target.closest('#tennis-clickable')) {
            return fetchAndShowTennisMatches();
        }
        if (target.closest('#coffee-clickable')) {
            return fetchAndShowCoffeeTip(dates.active);
        }
        if (target.closest('#guitar-clickable')) {
            return fetchAndShowGuitarTab(dates.active);
        }
        if (target.closest('#poetry-clickable')) {
            return fetchAndShowPoetry(dates.active);
        }

        // Legacy crossover/night handlers
        if (target.closest('#food-preview-clickable-crossover') || target.closest('#food-preview-clickable-night')) {
            return showFoodModal('tomorrow', dates, keys);
        }
        if (target.closest('#frenchy-preview-clickable-crossover') || target.closest('#frenchy-preview-clickable-night')) {
            window.location.href = 'french.html';
            return;
        }
        if (target.closest('#analytics-preview-clickable-crossover') || target.closest('#analytics-preview-clickable-night')) {
            return showAnalyticsModal('tomorrow', dates);
        }
        if (target.closest('#hood-preview-clickable-crossover') || target.closest('#hood-preview-clickable-night')) {
            return showHoodModal('tomorrow', dates);
        }
        if (target.closest('#exercise-preview-clickable-crossover') || target.closest('#exercise-preview-clickable-night')) {
            return showExerciseModal('tomorrow', dates);
        }
        if (target.closest('#geopolitics-clickable-crossover') || target.closest('#geopolitics-clickable-night')) {
            return fetchAndShowWorldOrder();
        }
        if (target.closest('#tennis-clickable-crossover') || target.closest('#tennis-clickable-night')) {
            return fetchAndShowTennisMatches();
        }
        if (target.closest('#coffee-clickable-crossover') || target.closest('#coffee-clickable-night')) {
            return fetchAndShowCoffeeTip(dates.active);
        }
        if (target.closest('#guitar-clickable-crossover') || target.closest('#guitar-clickable-night')) {
            return fetchAndShowGuitarTab(dates.active);
        }
        if (target.closest('#poetry-clickable-crossover') || target.closest('#poetry-clickable-night')) {
            return fetchAndShowPoetry(dates.active);
        }
    });
}
