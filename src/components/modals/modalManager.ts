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
    };
    keys: {
        today: string;
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
            return showFoodModal(dates.active, keys.today);
        }
        if (target.closest('#frenchy-clickable-day')) {
            window.location.href = 'french.html';
            return;
        }
        if (target.closest('#analytics-clickable-day')) {
            return showAnalyticsModal(dates.active);
        }
        if (target.closest('#hood-clickable-day')) {
            return showHoodModal(dates.active);
        }
        if (target.closest('#exercise-clickable-day')) {
            return showExerciseModal(dates.active);
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
    });
}
