// Modal handlers are imported lazily — none of them are needed for first
// paint of the home, so keeping them off the initial chunk shaves both JS
// and CSS weight from the cold-start path. Dynamic imports resolve
// instantly on the second open because the module graph is cached.
//
// Router integration: when a `router` is passed in, learn-modal modules
// route through `router.navigate(id)` (which drives the SDK lifecycle and
// updates the URL hash). The legacy per-module handlers stay around as a
// fallback for environments where the router isn't wired up (e.g. older
// tests, partial init).
import {
    getModulesByCategory,
    type LearnModuleId,
} from '../../domains/modules/registry';
import type { KingRouter } from '../../sdk/router';

type ModalDependencies = {
    dates: {
        active: Date;
    };
    keys: {
        today: string;
    };
};

type LearnModuleHandler = (dependencies: ModalDependencies) => void | Promise<void>;

const LEARN_MODULE_HANDLERS: Record<LearnModuleId, LearnModuleHandler> = {
    food: async ({ dates, keys }) => {
        const m = await import('./foodModal');
        return m.showFoodModal(dates.active, keys.today);
    },
};

export interface ModalManagerOptions {
    router?: KingRouter;
}

export function initializeModalManager(
    appContainer: HTMLElement,
    dependencies: ModalDependencies,
    options: ModalManagerOptions = {}
) {
    const learnModules = getModulesByCategory('learn');
    const router = options.router;

    appContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Modal Closers
        const activeModal = target.closest('.fixed.flex');
        if (activeModal && (target.closest('.modal-close-btn') || target === activeModal)) {
            if (router) {
                // Router owns the lifecycle — destroying the controller and
                // hiding the wrapper happen as part of navigate(null).
                void router.navigate(null);
            } else {
                activeModal.classList.add('hidden');
                activeModal.classList.remove('flex');
            }
            return;
        }

        // Learn module handlers - registry driven.
        for (const module of learnModules) {
            if (!target.closest(module.entrySelector)) continue;

            // Modal-surface learn modules route through the SDK router when
            // it's available.
            if (router && module.surface === 'modal') {
                void router.navigate(module.id);
                return;
            }

            const handler = LEARN_MODULE_HANDLERS[module.id];
            return handler(dependencies);
        }
    });
}
