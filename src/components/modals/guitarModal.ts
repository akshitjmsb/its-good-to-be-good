import { ai, hasApiKey, getOrGenerateDynamicContent, type ResponseSchema } from "../../api/perplexity";
import { getFallbackClassicRockPool } from "../../api/fallbacks";
import { getDayOfYear } from "../../utils/date";
import { escapeHtml } from "../../utils/escapeHtml";
import { loadGuitarRecentPicks, saveGuitarRecentPick } from "../../core/supabase-persistence";
import { DEFAULT_USER_ID } from "../../core/default-user";
import { getModalElements, showModalWithLoading, showModalError, setModalContent, MODAL_CONFIGS } from "./factory";

export async function fetchAndShowGuitarTab(activeContentDate: Date) {
    const elements = getModalElements(MODAL_CONFIGS.guitar);
    if (!elements) return;

    showModalWithLoading(elements, MODAL_CONFIGS.guitar.loadingMessage);

    let data: {
        title: string;
        artist: string;
        key: string;
        tuning: string;
        lyricsWithChords: string;
        chordChanges: string;
        inspiration: string;
        youtubeLessonTitle: string;
        youtubeLessonUrl: string;
        spotifyUrl: string;
    } | null = null;

    try {
        const dayOfYear = getDayOfYear(activeContentDate);

        // Load recent picks from Supabase
        const recent = await loadGuitarRecentPicks(DEFAULT_USER_ID);

        let songPool: Array<{ title: string; artist: string }> = [];
        try {
            const pool = await getOrGenerateDynamicContent(DEFAULT_USER_ID, 'classic-rock-500', activeContentDate);
            if (Array.isArray(pool) && pool.length > 0) {
                songPool = pool
                    .filter(item => item && typeof item.title === 'string' && typeof item.artist === 'string')
                    .map(item => ({ title: item.title, artist: item.artist }));
            }
        } catch (e) {
            console.warn('Could not load classic-rock-500 pool. Falling back to AI-random.', e);
        }
        if (songPool.length === 0) {
            songPool = getFallbackClassicRockPool();
        }

        let pickedTitle = '';
        let pickedArtist = '';
        if (songPool.length > 0) {
            const pool = songPool.filter(s => !recent.includes(`${s.title} — ${s.artist}`));
            const selectionPool = pool.length > 0 ? pool : songPool;
            const idx = Math.floor(Math.random() * selectionPool.length);
            const picked = selectionPool[idx];
            pickedTitle = picked.title; pickedArtist = picked.artist;
            await saveGuitarRecentPick(DEFAULT_USER_ID, picked.title, picked.artist);
        }
        if (!pickedTitle || !pickedArtist) {
            pickedTitle = 'Smoke on the Water';
            pickedArtist = 'Deep Purple';
        }

        if (!hasApiKey) {
            const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${pickedTitle} ${pickedArtist} guitar lesson`)}`;
            const spotifySearch = `https://open.spotify.com/search/${encodeURIComponent(`${pickedTitle} ${pickedArtist}`)}`;
            data = {
                title: pickedTitle,
                artist: pickedArtist,
                key: 'E minor',
                tuning: 'Standard E A D G B E',
                lyricsWithChords: `Em   C   G   D\n[Practice groove for ${pickedTitle}]`,
                chordChanges: 'Verse: Em-C-G-D | Chorus: G-D-Em-C',
                inspiration: `Start with a slow, steady tempo and focus on clean chord transitions for "${pickedTitle}".`,
                youtubeLessonTitle: `Search YouTube for ${pickedTitle} ${pickedArtist} guitar lesson`,
                youtubeLessonUrl: youtubeSearch,
                spotifyUrl: spotifySearch
            };
        } else {

            const prompt = pickedTitle && pickedArtist
                ? `Create a concise guitar lesson for the specific classic rock song below. Return JSON ONLY with these exact fields. Do not add extra text.\n\nSong: "${pickedTitle}" by "${pickedArtist}"\n\n{\n  "title": "Song title only",\n  "artist": "Artist name",\n  "key": "Musical key (e.g., A minor, E major)",\n  "tuning": "Guitar tuning (e.g., Standard E A D G B E, Drop D, Eb Standard)",\n  "lyricsWithChords": "Multi-line text with chords inline or above lyrics. Keep it short (intro/verse/chorus). Use plain ASCII.",\n  "chordChanges": "Concise chord progression overview (e.g., Verse: G-D-Em-C | Chorus: C-G-Am-F)",\n  "inspiration": "Song facts about what inspired the song. Make me fall in love with it.",\n  "youtubeLessonTitle": "Best YouTube video title for a guitar lesson on this song",\n  "youtubeLessonUrl": "Direct YouTube URL starting with https:// (must be a watch URL, not Shorts or playlist)",\n  "spotifyUrl": "Direct Spotify track URL starting with https://open.spotify.com/"\n}\n\nRules:\n- Keep lyrics snippet short and fair-use; do not include full lyrics.\n- Ensure URLs are valid-looking and direct. No markdown, no extra commentary.`
                : `Give me a Random Classic Rock song that I can learn to play on Guitar for day ${dayOfYear} of the year. Return JSON ONLY with these exact fields:\n\n{\n  "title": "Song title only",\n  "artist": "Artist name",\n  "key": "Musical key (e.g., A minor, E major)",\n  "tuning": "Guitar tuning (e.g., Standard E A D G B E, Drop D, Eb Standard)",\n  "lyricsWithChords": "Multi-line text with chords inline or above lyrics. Keep it short (intro/verse/chorus). Use plain ASCII.",\n  "chordChanges": "Concise chord progression overview (e.g., Verse: G-D-Em-C | Chorus: C-G-Am-F)",\n  "inspiration": "Song facts about what inspired the song. Make me fall in love with it.",\n  "youtubeLessonTitle": "Best YouTube video title for a guitar lesson on this song",\n  "youtubeLessonUrl": "Direct YouTube URL starting with https:// (must be a watch URL, not Shorts or playlist)",\n  "spotifyUrl": "Direct Spotify track URL starting with https://open.spotify.com/"\n}\n\nRules:\n- Keep lyrics snippet short and fair-use; do not include full lyrics.\n- Ensure URLs are valid-looking and direct. No markdown, no extra commentary.`;
            const responseSchema: ResponseSchema = {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    artist: { type: "STRING" },
                    key: { type: "STRING" },
                    tuning: { type: "STRING" },
                    lyricsWithChords: { type: "STRING" },
                    chordChanges: { type: "STRING" },
                    inspiration: { type: "STRING" },
                    youtubeLessonTitle: { type: "STRING" },
                    youtubeLessonUrl: { type: "STRING" },
                    spotifyUrl: { type: "STRING" }
                },
                required: [
                    'title',
                    'artist',
                    'key',
                    'tuning',
                    'lyricsWithChords',
                    'chordChanges',
                    'inspiration',
                    'youtubeLessonTitle',
                    'youtubeLessonUrl',
                    'spotifyUrl'
                ]
            };

            const response = await ai.models.generateContent({
                model: 'sonar-pro',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema
                }
            });

            try {
                data = JSON.parse(response.text);
            } catch (jsonError) {
                console.error('Failed to parse JSON for guitar feature:', jsonError);
                showModalError(elements, 'Could not parse the guitar pick. Please try again later.');
                return;
            }
        }
    } catch (error) {
        console.error('Error fetching Guitar feature:', error);
        showModalError(elements, 'Could not retrieve a guitar pick at this time.');
        return;
    }

    if (!data) {
        showModalError(elements, 'No data returned for this guitar pick.');
        return;
    }

    const safe = (s: string) => escapeHtml((s || '').replace(/\*/g, ''));
    const isValidYouTubeUrl = (url: string) => {
        if (!url) return false;
        const badPatterns = /\/shorts\//i;
        const validPatterns = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/i;
        return validPatterns.test(url) && !badPatterns.test(url);
    };
    const isLikelyGuitarLesson = (title: string, url: string) => {
        const t = (title || '').toLowerCase();
        const hasKeywords = t.includes('guitar') && (t.includes('lesson') || t.includes('tutorial') || t.includes('how to') || t.includes('tabs'));
        const notLiveOrShorts = !/\blive\b/i.test(t) && !/\/shorts\//i.test(url || '');
        return hasKeywords && notLiveOrShorts;
    };
    const isValidSpotifyTrackUrl = (url: string) => /^(https?:\/\/)?open\.spotify\.com\/track\/[A-Za-z0-9]{22}(\?.*)?$/i.test(url || '');

    const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${data.title} ${data.artist} guitar lesson`)}`;
    const spSearchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${data.title} ${data.artist}`)}`;

    const ytIsUsable = isValidYouTubeUrl(data.youtubeLessonUrl) && isLikelyGuitarLesson(data.youtubeLessonTitle, data.youtubeLessonUrl);
    const chosenYouTubeUrl = ytIsUsable ? data.youtubeLessonUrl : ytSearchUrl;
    const chosenYouTubeTitle = ytIsUsable
        ? data.youtubeLessonTitle
        : `Search YouTube for ${data.title} ${data.artist} guitar lesson`;
    const chosenSpotifyUrl = isValidSpotifyTrackUrl(data.spotifyUrl) ? data.spotifyUrl : spSearchUrl;

    const html = `
        <div class="space-y-4">
            <h4 class="font-bold text-md">${safe(data.title)} — ${safe(data.artist)}</h4>

            <div class="text-sm">
                <p><span class="font-semibold">Key:</span> ${safe(data.key)}</p>
                <p><span class="font-semibold">Tuning:</span> ${safe(data.tuning)}</p>
            </div>

            <div class="bg-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
                <p class="font-semibold mb-1">Lyrics & Chords (excerpt)</p>
                <pre>${safe(data.lyricsWithChords)}</pre>
            </div>

            <div class="bg-blue-50 p-3 rounded text-sm">
                <p class="font-semibold mb-1">Chord Changes</p>
                <p>${safe(data.chordChanges)}</p>
            </div>

            <div class="text-sm">
                <p class="font-semibold mb-1">Why this song rocks</p>
                <p>${safe(data.inspiration)}</p>
            </div>

            <div class="text-sm">
                <p class="font-semibold mb-1">Best YouTube Lesson</p>
                <a href="${safe(chosenYouTubeUrl)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">
                    ${safe(chosenYouTubeTitle)}
                </a>
            </div>

            <div class="text-sm">
                <p class="font-semibold mb-1">Listen on Spotify</p>
                <a href="${safe(chosenSpotifyUrl)}" target="_blank" rel="noopener noreferrer" class="text-green-700 underline">
                    ${safe(chosenSpotifyUrl)}
                </a>
            </div>
        </div>
    `;
    setModalContent(elements, html);
}
