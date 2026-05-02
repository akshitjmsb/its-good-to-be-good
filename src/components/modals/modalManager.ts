import { showFoodModal } from './foodModal';
import { showAnalyticsModal, cleanupAnalyticsEventListeners } from './analyticsModal';
import { showHoodModal } from './hoodModal';
import { showExerciseModal } from './exerciseModal';
import { fetchAndShowWorldOrder } from './worldOrderModal';
import { fetchAndShowTennisMatches } from './tennisModal';
import { showCoffeeMenu } from './coffeeModal';
import { fetchAndShowGuitarTab } from './guitarModal';
import { fetchAndShowPoetry } from './poetryModal';
import {
    getModulesByCategory,
    type LearnModuleId,
} from '../../domains/modules/registry';

type ModalDependencies = {
    dates: {
        active: Date;
    };
    keys: {
        today: string;
    };
};

type LearnModuleHandler = (dependencies: ModalDependencies) => void | Promise<void>;

function navigateToFrenchPage(): void {
    window.location.href = 'french.html';
}

const LEARN_MODULE_HANDLERS: Record<LearnModuleId, LearnModuleHandler> = {
    'world-order': () => fetchAndShowWorldOrder(),
    tennis: () => fetchAndShowTennisMatches(),
    coffee: ({ dates }) => showCoffeeMenu(dates.active),
    guitar: ({ dates }) => fetchAndShowGuitarTab(dates.active),
    poetry: ({ dates }) => fetchAndShowPoetry(dates.active),
    french: navigateToFrenchPage,
    food: ({ dates, keys }) => showFoodModal(dates.active, keys.today),
    analytics: ({ dates }) => showAnalyticsModal(dates.active),
    curious: ({ dates }) => showHoodModal(dates.active),
    exercise: ({ dates }) => showExerciseModal(dates.active),
};

export function initializeModalManager(
    appContainer: HTMLElement,
    dependencies: ModalDependencies
) {
    const learnModules = getModulesByCategory('learn');

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

        // Learn module handlers - registry driven
        for (const module of learnModules) {
            if (target.closest(module.entrySelector)) {
                const handler = LEARN_MODULE_HANDLERS[module.id];
                return handler(dependencies);
            }
        }
    });
}
