import { getCanonicalTime } from "./core/time";
import { loadTasks as loadTasksFromSupabase } from "./core/supabase-persistence";
import { initializeQuantumTimer } from "./components/quantumTimer";
import { initializeTaskForms, renderTasks, attachTaskListeners } from "./components/tasks";
import { ai } from "./api/perplexity";
import { initializeModalManager } from "./components/modals/modalManager";
import { renderModuleIcons, renderNavigationIcons } from "./utils/iconRenderer";
import { getPhilosophicalQuoteInstant, generateAIPhilosophicalQuote, showQuoteLoadingIndicator, hideQuoteLoadingIndicator, MultilingualQuote } from "./components/reflection";
import { DEFAULT_USER_ID } from "./core/default-user";

document.addEventListener('DOMContentLoaded', () => {
    // --- DEFAULT USER ID (No authentication required) ---
    const currentUserId: string = DEFAULT_USER_ID;

    // --- STATE & DERIVED DATA ---
    let todayKey: string;
    let activeContentDate: Date;
    let todaysQuote: MultilingualQuote | null = null;

    async function updateDateDerivedData() {
        const { now } = getCanonicalTime();

        // Use current date as active content date
        activeContentDate = new Date(now);
        todayKey = activeContentDate.toISOString().split('T')[0];

        // Load philosophical quote instantly (no API call blocking)
        todaysQuote = getPhilosophicalQuoteInstant(activeContentDate);

        // Optionally generate AI quote in background for future use
        if (ai) {
            showQuoteLoadingIndicator();

            generateAIPhilosophicalQuote(activeContentDate).then(aiQuote => {
                hideQuoteLoadingIndicator();

                if (aiQuote && aiQuote.quote !== todaysQuote?.quote) {
                    todaysQuote = aiQuote;
                    const lifePointerEl = document.getElementById('life-pointer-display-day');
                    if (lifePointerEl) {
                        const isMultilingual = aiQuote.language !== 'en' && (aiQuote.transliteration || aiQuote.translation);
                        lifePointerEl.innerHTML = `
                            <div class="quote-original ${isMultilingual ? 'multilingual' : ''}" lang="${aiQuote.language}">
                                "${aiQuote.quote}"
                            </div>
                            ${aiQuote.transliteration ? `<div class="quote-transliteration">${aiQuote.transliteration}</div>` : ''}
                            ${aiQuote.translation ? `<div class="quote-translation">"${aiQuote.translation}"</div>` : ''}
                            <div class="quote-author">— ${aiQuote.author}</div>
                        `;
                    }
                }
            }).catch(error => {
                hideQuoteLoadingIndicator();
                console.log("Background AI quote generation failed, using curated quote:", error);
            });
        }
    }
    
    let tasks: { text: string; completed: boolean }[] = [];

    // --- DATA PERSISTENCE ---

    // --- DYNAMIC CONTENT GENERATION & CACHING ---
    
    /**
     * Displays a status message to the user, typically for content synchronization.
     * @param {string} message The message to display.
     * @param {boolean} isFinal If true, the message will disappear after a short delay.
     */
    function showSyncStatus(message: string, isFinal: boolean = false) {
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            statusEl.innerHTML = message;
            statusEl.classList.remove('hidden');
            if (isFinal) {
                setTimeout(() => {
                    statusEl.classList.add('hidden');
                }, 2500); // Hide after 2.5 seconds
            }
        }
    }



    // --- FOOD PLAN & CORE DATA LOGIC ---


    async function loadCoreData() {
        // All dynamic content (food plans, French lessons) is now loaded on-demand
        // when the user clicks to open a modal. This avoids caching content on one
        // device that isn't available on another.
    }

    
    // --- RENDER FUNCTIONS ---
    
    // renderChatHistory function removed for simplicity
    
    
    async function mainRender() {
        // Recalculate date variables each time render is called
        await updateDateDerivedData();

        await loadCoreData();
        tasks = await loadTasksFromSupabase(currentUserId);

        // Always show day module
        const dayModule = document.getElementById('day-module') as HTMLElement;
        if (dayModule) dayModule.classList.add('active');

        // Update dynamic icon
        updateDynamicIcon();

        // Render navigation icons
        renderNavigationIcons();

        // Render content
        await renderDayModule();
    }

    function updateDynamicIcon() {
        const iconEl = document.getElementById('dynamic-time-icon') as HTMLElement;
        if (!iconEl) return;

        // Simple sparkle icon for Mr. Mojo Rising
        iconEl.textContent = '✨';
        iconEl.className = 'theme-icon';
    }

    // Error boundary function
    function handleGlobalError(error: Error, context: string) {
        console.error(`Error in ${context}:`, error);
        
        // Show user-friendly error message
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            statusEl.innerHTML = `⚠️ Error in ${context}. Please refresh the page.`;
            statusEl.classList.remove('hidden');
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 5000);
        }
    }

    // Authentication removed - using default anonymous user

    async function initializeApp() {
        try {
            // No authentication required - using default user ID
            // Render icons immediately for better UX
            renderModuleIcons();
            
            await updateDateDerivedData(); // Ensure date-derived data is available
            initializeQuantumTimer();

            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                const modalDependencies = {
                    dates: {
                        active: activeContentDate,
                        preview: activeContentDate, // Use same date for now
                    },
                    keys: {
                        today: todayKey,
                        tomorrow: todayKey, // Use same key for now
                    },
                };
                initializeModalManager(appContainer, modalDependencies);
                initializeTaskForms(tasks, currentUserId, mainRender);
                attachTaskListeners('tasks-list-day', currentUserId);
            }

            function updateTime() {
                const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
                const el = document.getElementById('current-datetime');
                if (el) el.textContent = new Date().toLocaleString('en-CA', options);
            }
            updateTime();
            
            // Load persistent data on startup
            // Chat functionality removed for simplicity
            
            await mainRender();

            setInterval(updateTime, 1000);
            setInterval(async () => {
                try {
                    await mainRender();
                } catch (error) {
                    handleGlobalError(error as Error, 'periodic update');
                }
            }, 60000 * 5); // every 5 minutes
            
            // More frequent task syncing for better cross-device experience
            setInterval(async () => {
                try {
                    const tasks = await loadTasksFromSupabase(currentUserId);
                    renderTasks(tasks, 'tasks-list-day');
                } catch (error) {
                    console.warn('Failed to sync tasks:', error);
                }
            }, 30000); // every 30 seconds
        } catch (error) {
            handleGlobalError(error as Error, 'app initialization');
        }
    }

    initializeApp();
    
    // --- MODULE EDITING FUNCTIONALITY REMOVED ---
    // All edit module names functionality has been removed for cleaner design

    // --- MODULE RENDERING FUNCTIONS ---
    
    function renderQuoteHTML(quote: MultilingualQuote): string {
        const isMultilingual = quote.language !== 'en' && (quote.transliteration || quote.translation);
        return `
            <div class="quote-original ${isMultilingual ? 'multilingual' : ''}" lang="${quote.language}">
                "${quote.quote}"
            </div>
            ${quote.transliteration ? `<div class="quote-transliteration">${quote.transliteration}</div>` : ''}
            ${quote.translation ? `<div class="quote-translation">"${quote.translation}"</div>` : ''}
            <div class="quote-author">— ${quote.author}</div>
        `;
    }

    async function renderDayModule() {
        // Display philosophical quote
        const lifePointerEl = document.getElementById('life-pointer-display-day');
        if (lifePointerEl && todaysQuote) {
            lifePointerEl.innerHTML = renderQuoteHTML(todaysQuote);
        }

        const reflectionPromptEl = document.getElementById('reflection-prompt-display-day');
        if (reflectionPromptEl) reflectionPromptEl.textContent = '';

        renderTasks(tasks, 'tasks-list-day');
    }
});