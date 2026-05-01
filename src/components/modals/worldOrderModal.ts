import { ai } from "../../infra/ai";
import { createSafeHtml } from "../../utils/escapeHtml";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, MODAL_CONFIGS } from "./factory";

export async function fetchAndShowWorldOrder() {
    const elements = getModalElements(MODAL_CONFIGS.worldOrder);
    if (!elements) return;

    showModalWithLoading(elements, MODAL_CONFIGS.worldOrder.loadingMessage);

    try {
        if (!ai) {
            showModalError(elements, 'AI functionality is not available. Please check your API key configuration.');
            return;
        }

        const prompt = "Be extremely brief. First, what is the single most important, recent headline about Donald Trump? State it in 10 words or less. Then, list the 5 most critical world order headlines (US/Canada focused) as ultra-short, scannable bullet points. Finally, list the 5 latest major headlines from India in the same brief format. Do not use asterisks or any markdown formatting.";

        const response = await ai.models.generateContent({
            model: "sonar-pro",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        if (response.text) {
            const safeText = createSafeHtml(response.text.replace(/\*/g, ''), {
                maxLength: 15000
            });
            setModalContent(elements, `<div class="mb-4">${safeText}</div>`);
        } else {
            showModalError(elements, 'Could not retrieve any news data at this time.');
        }
    } catch (error) {
        console.error("Error fetching World Order headlines:", error);
        showModalError(elements, 'An API Error occurred. Could not fetch headlines at this time.');
    }
}
