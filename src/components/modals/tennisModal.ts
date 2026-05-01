import { ai } from "../../infra/ai";
import { createSafeHtml } from "../../utils/escapeHtml";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, MODAL_CONFIGS } from "./factory";

export async function fetchAndShowTennisMatches() {
    const elements = getModalElements(MODAL_CONFIGS.tennis);
    if (!elements) return;

    showModalWithLoading(elements, MODAL_CONFIGS.tennis.loadingMessage);

    try {
        const today = new Date().toISOString().split('T')[0];
        const prompt = `Use Google Search and list the most recent ATP and WTA singles matches for yesterday, today, and tomorrow (relative to ${today}).

Output plain text only (no HTML, no markdown table).
Use this format:

ATP
- [Date] | [Tournament, City] | [Round] | [Player A vs Player B] | [Scheduled/In progress/Completed + score or time]

WTA
- [Date] | [Tournament, City] | [Round] | [Player A vs Player B] | [Scheduled/In progress/Completed + score or time]

Then add:
- Canadian players: ...
- Finals: ...
- Upsets: ...

Keep it concise and strictly factual.`;

        const response = await ai.models.generateContent({
            model: 'sonar-pro',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        if (response.text) {
            const safeText = createSafeHtml(response.text, { maxLength: 20000 });
            setModalContent(elements, `<div class="mb-4">${safeText}</div>`);
        } else {
            showModalError(elements, 'Could not retrieve any tennis data at this time.');
        }
    } catch (error) {
        console.error("Error fetching Tennis data:", error);
        showModalError(elements, 'An API Error occurred. Could not fetch tennis information at this time.');
    }
}
