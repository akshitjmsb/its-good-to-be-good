import { ai, type ResponseSchema } from "../../infra/ai";
import { getDayOfYear } from "../../utils/date";
import { escapeHtml } from "../../utils/escapeHtml";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, MODAL_CONFIGS } from "./factory";

export async function fetchAndShowCoffeeTip(activeContentDate: Date) {
    const elements = getModalElements(MODAL_CONFIGS.coffee);
    if (!elements) return;

    showModalWithLoading(elements, MODAL_CONFIGS.coffee.loadingMessage);

    if (!ai) {
        showModalError(elements, 'AI functionality is not available. Please check your API key configuration.');
        return;
    }

    try {
        const dayOfYear = getDayOfYear(activeContentDate);
        const prompt = `For day ${dayOfYear} of the year, generate a unique, self-contained mini-lesson for someone aspiring to open their own coffee cafe. The lesson should cover a practical aspect of the coffee industry, market, or business operations. Provide a clear title, a detailed but accessible explanation, and a single key takeaway for a future cafe owner. Do not use asterisks or markdown.`;

        const responseSchema: ResponseSchema = {
            type: "OBJECT",
            properties: {
                title: {
                    type: "STRING",
                    description: 'The title of the coffee industry lesson.'
                },
                explanation: {
                    type: "STRING",
                    description: 'A detailed explanation of the topic.'
                },
                takeaway: {
                    type: "STRING",
                    description: 'A single, actionable takeaway for a future cafe owner.'
                }
            },
            required: ["title", "explanation", "takeaway"]
        };

        const response = await ai.models.generateContent({
            model: 'sonar-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });

        let coffeeData;
        try {
            coffeeData = JSON.parse(response.text);
        } catch (jsonError) {
            console.error("Failed to parse JSON from Perplexity response for coffee lesson:", jsonError);
            showModalError(elements, 'Could not parse the lesson. Please try again later.');
            return;
        }

        if (coffeeData && coffeeData.title && coffeeData.explanation && coffeeData.takeaway) {
            const html = `
                <h4 class="font-bold text-md mb-2">${escapeHtml(coffeeData.title)}</h4>
                <p class="text-base mb-4">${escapeHtml(coffeeData.explanation)}</p>
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <p class="text-sm font-bold">Key Takeaway:</p>
                    <p class="text-sm italic">${escapeHtml(coffeeData.takeaway)}</p>
                </div>
            `;
            setModalContent(elements, html);

        } else {
            showModalError(elements, 'Could not retrieve a coffee lesson. The response was empty.');
        }
    } catch (error) {
        console.error("Error fetching Coffee Lesson:", error);
        showModalError(elements, 'Could not retrieve a coffee lesson at this time.');
    }
}
