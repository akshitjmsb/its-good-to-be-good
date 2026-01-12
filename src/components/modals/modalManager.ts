import { showFoodModal } from './foodModal';
import { showFrenchModal } from './frenchModal';
import { showAnalyticsModal, cleanupAnalyticsEventListeners } from './analyticsModal';
import { showHoodModal } from './hoodModal';
import { showExerciseModal } from './exerciseModal';
import { fetchAndShowWorldOrder } from './worldOrderModal';
import { fetchAndShowTennisMatches } from './tennisModal';
import { fetchAndShowCoffeeTip } from './coffeeModal';
import { fetchAndShowGuitarTab } from './guitarModal';
import { fetchAndShowHistory } from './historyModal';
import { fetchAndShowPoetry } from './poetryModal';
import { showSessionPrompt, SessionChoice } from '../SessionPrompt';
import { showHistoryBrowser } from '../HistoryBrowser';
import { SessionContentType, getLatestSession } from '../../core/learning-sessions';
import { DEFAULT_USER_ID } from '../../core/default-user';
import { displaySavedSessionContent, getModalNameForContentType } from './factory';

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

// Store dependencies for use in handlers
let storedDependencies: ModalDependencies | null = null;

/**
 * Handle session prompt choice for a topic
 */
async function handleSessionChoice(choice: SessionChoice, topic: SessionContentType): Promise<void> {
    if (!storedDependencies) return;

    const { dates, keys } = storedDependencies;

    switch (choice) {
        case 'new':
            // Start a fresh session - open the modal normally
            openModalForTopic(topic, dates, keys);
            break;

        case 'continue':
            // Continue last session - load and display saved content
            const session = await getLatestSession(DEFAULT_USER_ID, topic);
            if (session) {
                const modalName = getModalNameForContentType(topic);
                if (modalName) {
                    displaySavedSessionContent(modalName, session.content, session.title);
                }
            } else {
                // No session found, open new
                openModalForTopic(topic, dates, keys);
            }
            break;

        case 'browse':
            // Show history browser filtered to this topic
            showHistoryBrowser('topics');
            break;
    }
}

/**
 * Open the appropriate modal for a topic
 */
function openModalForTopic(
    topic: SessionContentType,
    dates: { active: Date; preview: Date },
    keys: { today: string; tomorrow: string }
): void {
    switch (topic) {
        case 'french':
            showFrenchModal('today', dates);
            break;
        case 'food':
            showFoodModal('today', dates, keys);
            break;
        case 'analytics':
            showAnalyticsModal('today', dates);
            break;
        case 'hood':
            showHoodModal('today', dates);
            break;
        case 'exercise':
            showExerciseModal('today', dates);
            break;
        case 'geopolitics':
            fetchAndShowWorldOrder();
            break;
        case 'tennis':
            fetchAndShowTennisMatches();
            break;
        case 'coffee':
            fetchAndShowCoffeeTip(dates.active);
            break;
        case 'guitar':
            fetchAndShowGuitarTab(dates.active);
            break;
        case 'history':
            fetchAndShowHistory();
            break;
        case 'poetry':
            fetchAndShowPoetry(dates.active);
            break;
    }
}

/**
 * Show session prompt for a topic (checks for existing sessions)
 */
async function showPromptForTopic(topic: SessionContentType): Promise<void> {
    try {
        const latestSession = await getLatestSession(DEFAULT_USER_ID, topic);
        const hasExistingSession = latestSession !== null;

        showSessionPrompt(topic, hasExistingSession, handleSessionChoice);
    } catch (error) {
        console.error('Error showing session prompt:', error);
        // Fallback: open modal directly without session prompt
        if (storedDependencies) {
            openModalForTopic(topic, storedDependencies.dates, storedDependencies.keys);
        }
    }
}

/**
 * Map click targets to session content types
 */
function getTopicFromClickTarget(target: HTMLElement): SessionContentType | null {
    if (target.closest('#food-clickable-day')) return 'food';
    if (target.closest('#frenchy-clickable-day')) return 'french';
    if (target.closest('#analytics-clickable-day')) return 'analytics';
    if (target.closest('#hood-clickable-day')) return 'hood';
    if (target.closest('#exercise-clickable-day')) return 'exercise';
    if (target.closest('#geopolitics-clickable')) return 'geopolitics';
    if (target.closest('#tennis-clickable')) return 'tennis';
    if (target.closest('#coffee-clickable')) return 'coffee';
    if (target.closest('#guitar-clickable')) return 'guitar';
    if (target.closest('#history-clickable')) return 'history';
    if (target.closest('#poetry-clickable')) return 'poetry';
    return null;
}

export function initializeModalManager(
    appContainer: HTMLElement,
    dependencies: ModalDependencies
) {
    // Store dependencies for later use
    storedDependencies = dependencies;

    appContainer.addEventListener('click', async (e) => {
        try {
            const target = e.target as HTMLElement;

            // Modal Closers
            const activeModal = target.closest('.fixed.flex');
            if (activeModal && (target.closest('.modal-close-btn') || target === activeModal)) {
                activeModal.classList.add('hidden');
                activeModal.classList.remove('flex');

                // Clean up analytics modal event listeners if it's the analytics modal
                if (activeModal.id === 'analytics-engineer-modal') {
                    cleanupAnalyticsEventListeners();
                }
                return;
            }

            // Check if clicking on a topic card
            const topic = getTopicFromClickTarget(target);
            if (topic) {
                e.preventDefault();
                await showPromptForTopic(topic);
                return;
            }

        // Legacy crossover/night handlers (no session prompt for these)
        const { dates, keys } = dependencies;

        if (target.closest('#food-preview-clickable-crossover') || target.closest('#food-preview-clickable-night')) {
            return showFoodModal('tomorrow', dates, keys);
        }

        if (target.closest('#frenchy-preview-clickable-crossover') || target.closest('#frenchy-preview-clickable-night')) {
            return showFrenchModal('tomorrow', dates);
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

        // These modals don't have crossover variants in current HTML
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
        if (target.closest('#history-clickable-crossover') || target.closest('#history-clickable-night')) {
            return fetchAndShowHistory();
        }
        if (target.closest('#poetry-clickable-crossover') || target.closest('#poetry-clickable-night')) {
            return fetchAndShowPoetry(dates.active);
        }
        } catch (error) {
            console.error('Error in modal manager click handler:', error);
        }
    });
}
