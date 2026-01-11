import { ai, type ResponseSchema } from "../../api/perplexity";
import { getDayOfYear } from "../../utils/date";
import { escapeHtml } from "../../utils/escapeHtml";
import { loadPoetryRecents, recordPoetrySelection, savePoetryRecents } from "../../core/supabase-persistence";
import { DEFAULT_USER_ID } from "../../core/default-user";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, saveSessionContent, MODAL_CONFIGS } from "./factory";

export async function fetchAndShowPoetry(activeContentDate: Date) {
    const elements = getModalElements(MODAL_CONFIGS.poetry);
    if (!elements) return;

    showModalWithLoading(elements, MODAL_CONFIGS.poetry.loadingMessage);

    try {
        const dayOfYear = getDayOfYear(activeContentDate);
        const poetryRecents = await loadPoetryRecents(DEFAULT_USER_ID);
        const recentPoets = poetryRecents.map(r => r.poet).filter(Boolean);
        const recentLanguages = poetryRecents.map(r => r.language).filter(Boolean);

        const prompt = `Task: Create a mini poetry moment with simple words.

Constraints:
- Pick a famous couplet from one poet in one language chosen from: Urdu, Hindi, Punjabi, English, Persian.
- Avoid using any poet in this do-not-repeat list: ${JSON.stringify(recentPoets)}
- Avoid using any language in this do-not-repeat list: ${JSON.stringify(recentLanguages)}
- Use day number ${dayOfYear} to help pick variety.

Write:
1) scene: 6–10 short sentences, present tense, simple everyday words. Place the poet clearly in their real historical era and place. Show what is happening around them that might inspire the couplet. Focus on clear, concrete details (what they see, hear, touch). End the scene right before the couplet is spoken, so the couplet feels like a natural result of the moment.
2) couplet: the exact couplet in the original script.
3) transliteration: simple romanized version.
4) translation: one or two short, plain sentences.
5) aboutWriter: 2–3 short lines about the poet.
6) poet: the poet's name.
7) language: the language of the couplet.

Rules:
- Keep language plain and readable.
- Respect the do-not-repeat lists for poet and language.
- Respond ONLY as strict JSON matching the provided schema.`;

        const responseSchema: ResponseSchema = {
            type: "OBJECT",
            properties: {
                scene: { type: "STRING" },
                couplet: { type: "STRING" },
                transliteration: { type: "STRING" },
                translation: { type: "STRING" },
                aboutWriter: { type: "STRING" },
                poet: { type: "STRING" },
                language: { type: "STRING" }
            },
            required: ["scene", "couplet", "transliteration", "translation", "aboutWriter", "poet", "language"]
        };

        const response = await ai.models.generateContent({
            model: 'sonar-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });

        let html = '';

        if (response.text) {
            try {
                const data = JSON.parse(response.text);
                html += `<div class="mb-6">`;
                html += `<h4 class="text-lg font-bold mb-1 text-center">Poetry in Motion</h4>`;
                if (data.poet || data.language) {
                    const byline = [data.poet, data.language].filter(Boolean).join(' · ');
                    if (byline) html += `<p class="text-center text-xs text-gray-600 mb-2">${escapeHtml(byline)}</p>`;
                }
                html += `<div class="bg-gray-50 p-4 rounded-lg mb-4">`;
                html += `<div class="text-sm leading-relaxed mb-4">${escapeHtml(data.scene)}</div>`;
                html += `<div class="border-l-4 border-blue-500 pl-4 my-4">`;
                html += `<p class="text-lg font-semibold mb-2">${escapeHtml(data.couplet)}</p>`;
                html += `<p class="text-sm text-gray-600 mb-2">${escapeHtml(data.transliteration)}</p>`;
                html += `<p class="text-sm italic">"${escapeHtml(data.translation)}"</p>`;
                html += `</div>`;
                html += `<div class="bg-blue-50 p-3 rounded-lg mt-4">`;
                html += `<h5 class="font-bold mb-2 text-sm">About the Writer:</h5>`;
                html += `<p class="text-sm leading-relaxed">${escapeHtml(data.aboutWriter)}</p>`;
                html += `</div>`;
                html += `</div>`;

                const poetName = typeof data.poet === 'string' ? data.poet : '';
                const langName = typeof data.language === 'string' ? data.language : '';
                const updatedRecents = recordPoetrySelection(poetryRecents, poetName, langName);
                await savePoetryRecents(DEFAULT_USER_ID, updatedRecents);

                // Save session for history
                saveSessionContent('poetry', data, `${poetName} - ${langName}`);
            } catch (parseError) {
                html += `<div class="mb-6">`;
                html += `<h4 class="text-lg font-bold mb-3 text-center">Poetry in Motion</h4>`;
                html += `<div class="bg-gray-50 p-4 rounded-lg">`;
                html += `<p class="text-sm leading-relaxed">${escapeHtml(response.text)}</p>`;
                html += `</div>`;
                html += `</div>`;
            }
        } else {
            showModalError(elements, 'Could not generate poetry at this time.');
            return;
        }

        setModalContent(elements, html);

    } catch (error) {
        console.error("Error fetching Poetry:", error);
        showModalError(elements, 'An API Error occurred. Could not generate poetry at this time.');
    }
}
