import { ai } from "../../api/perplexity";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, saveSessionContent, MODAL_CONFIGS } from "./factory";

export async function fetchAndShowHistory() {
    const elements = getModalElements(MODAL_CONFIGS.history);
    if (!elements) return;

    showModalWithLoading(elements, MODAL_CONFIGS.history.loadingMessage);

    try {
        const prompt = `Using Google Search, find one highly-rated and popular history documentary or explainer video on YouTube about World War I or World War II from a reputable source like a well-known documentary channel, museum, or educational institution. Prioritize content that is likely to be permanently available. Respond with only the video title and the direct YouTube URL in this exact format:\nTitle: [video title]\nURL: [video URL]`;

        const response = await ai.models.generateContent({
            model: 'sonar-pro',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        if (response.text) {
            const text = response.text.trim();
            const lines = text.split('\n');
            const titleLine = lines.find(line => line.toLowerCase().startsWith('title:'));
            const urlLine = lines.find(line => line.toLowerCase().startsWith('url:'));

            let html = '';
            let sessionTitle = 'History Documentary';
            if (titleLine && urlLine) {
                const title = titleLine.split(':').slice(1).join(':').trim();
                const url = urlLine.split(':').slice(1).join(':').trim();
                html += `<h4 class="text-lg font-bold mb-2"><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${title}</a></h4>`;
                html += `<p class="text-sm"><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:underline">${url}</a></p>`;
                sessionTitle = title;

                // Save session for history
                saveSessionContent('history', { title, url }, sessionTitle);
            } else {
                html += `<p>${text.replace(/\n/g, '<br>')}</p>`;
            }
            setModalContent(elements, html);
        } else {
            showModalError(elements, 'Could not find a history video at this time.');
        }
    } catch (error) {
        console.error("Error fetching History video:", error);
        showModalError(elements, 'An API Error occurred. Could not fetch a history video at this time.');
    }
}
