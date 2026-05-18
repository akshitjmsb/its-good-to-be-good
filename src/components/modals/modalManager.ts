// Modal handlers are imported lazily — none of them are needed for first
// paint of the home, so keeping them off the initial chunk shaves both JS
// and CSS weight from the cold-start path. Dynamic imports resolve
// instantly on the second open because the module graph is cached.
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

const MR_MOJO_RISING_URL = 'https://blissful-mccarthy-4d58a4.vercel.app';

function openMrMojoRising(): void {
    window.open(MR_MOJO_RISING_URL, '_blank', 'noopener,noreferrer');
}

const LEARN_MODULE_HANDLERS: Record<LearnModuleId, LearnModuleHandler> = {
    'world-order': async () => {
        const m = await import('./worldOrderModal');
        return m.fetchAndShowWorldOrder();
    },
    coffee: async ({ dates }) => {
        const m = await import('./coffeeModal');
        return m.showCoffeeMenu(dates.active);
    },
    guitar: openMrMojoRising,
    poetry: async ({ dates }) => {
        const m = await import('./poetryModal');
        return m.fetchAndShowPoetry(dates.active);
    },
    french: navigateToFrenchPage,
    food: async ({ dates, keys }) => {
        const m = await import('./foodModal');
        return m.showFoodModal(dates.active, keys.today);
    },
    analytics: async ({ dates }) => {
        const m = await import('./analyticsModal');
        return m.showAnalyticsModal(dates.active);
    },
    curious: async ({ dates }) => {
        const m = await import('./hoodModal');
        return m.showHoodModal(dates.active);
    },
    exercise: async ({ dates }) => {
        const m = await import('./exerciseModal');
        return m.showExerciseModal(dates.active);
    },
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
                // The analytics module is already in the module graph here
                // (the modal couldn't have opened otherwise), so this import
                // resolves synchronously from cache.
                void import('./analyticsModal').then(m =>
                    m.cleanupAnalyticsEventListeners()
                );
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
