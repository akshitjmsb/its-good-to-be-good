import { getOrGenerateDynamicContent } from "../../api/perplexity";
import { DEFAULT_USER_ID } from "../../core/default-user";
import { getModalElements, showModalWithLoading, setModalContent, setModalTitle, MODAL_CONFIGS } from "./factory";

export async function showFrenchModal(
    mode: 'today' | 'tomorrow' | 'archive',
    dates: { active: Date, preview: Date, archive?: Date }
) {
    const elements = getModalElements(MODAL_CONFIGS.french);
    if (!elements) return;

    const date = mode === 'today' ? dates.active : mode === 'tomorrow' ? dates.preview : dates.archive;

    if (mode === 'archive' && !dates.archive) {
        console.error('Archive mode requested but archive data not available');
        setModalContent(elements, '<tr><td colspan="3" class="text-center p-4">Archive functionality not available.</td></tr>');
        return;
    }

    showModalWithLoading(elements, MODAL_CONFIGS.french.loadingMessage);
    setModalTitle(elements, 'French');

    try {
        const soundData = await getOrGenerateDynamicContent(DEFAULT_USER_ID, 'french-sound', date);

        if (!soundData || !soundData.sound || !soundData.words) {
            setModalTitle(elements, 'French: Error');
            setModalContent(elements, '<tr><td colspan="5" class="text-center p-4">Could not load French lesson data.</td></tr>');
        } else {
            setModalTitle(elements, `French: " ${soundData.sound} "`);
            const html = soundData.words.map((item: any, index: number) =>
                `<tr><td class="font-bold text-center">${index + 1}</td><td>${item.word}</td><td>${item.cue}</td><td>${item.meaning}</td><td class="text-center"><button class="play-btn" data-word="${item.word}">🔊</button></td></tr>`
            ).join('');
            setModalContent(elements, html);
        }
    } catch (error) {
        console.error('Error showing French modal:', error);
        setModalTitle(elements, 'French: Error');
        setModalContent(elements, '<tr><td colspan="5" class="text-center p-4">An error occurred while loading the lesson.</td></tr>');
    }
}
