import {
  ai,
  hasApiKey,
  getOrGenerateDynamicContent,
  getFallbackClassicRockPool,
  type ResponseSchema,
} from '../../../infra/ai';
import { getDayOfYear } from '../../../utils/date';
import {
  loadGuitarRecentPicks,
  saveGuitarRecentPick,
} from '../../../infra/supabase/persistence';
import { DEFAULT_USER_ID } from '../../../core/default-user';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalContent,
  showModalError,
  showModalWithLoading,
} from '../factory';
import { GuitarLesson, GuitarSong } from './types';
import { renderGuitarLesson } from './view';

const RESPONSE_SCHEMA: ResponseSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    artist: { type: 'STRING' },
    key: { type: 'STRING' },
    tuning: { type: 'STRING' },
    lyricsWithChords: { type: 'STRING' },
    chordChanges: { type: 'STRING' },
    inspiration: { type: 'STRING' },
    youtubeLessonTitle: { type: 'STRING' },
    youtubeLessonUrl: { type: 'STRING' },
    spotifyUrl: { type: 'STRING' },
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
    'spotifyUrl',
  ],
};

async function loadSongPool(activeContentDate: Date): Promise<GuitarSong[]> {
  try {
    const pool = await getOrGenerateDynamicContent(
      DEFAULT_USER_ID,
      'classic-rock-500',
      activeContentDate
    );
    if (Array.isArray(pool) && pool.length > 0) {
      return pool
        .filter(
          item =>
            item && typeof item.title === 'string' && typeof item.artist === 'string'
        )
        .map(item => ({ title: item.title, artist: item.artist }));
    }
  } catch (e) {
    console.warn('Could not load classic-rock-500 pool. Falling back to AI-random.', e);
  }
  return getFallbackClassicRockPool();
}

async function pickSong(
  songPool: GuitarSong[],
  recent: string[]
): Promise<GuitarSong> {
  if (songPool.length === 0) {
    return { title: 'Smoke on the Water', artist: 'Deep Purple' };
  }

  const filtered = songPool.filter(
    s => !recent.includes(`${s.title} — ${s.artist}`)
  );
  const selectionPool = filtered.length > 0 ? filtered : songPool;
  const idx = Math.floor(Math.random() * selectionPool.length);
  const picked = selectionPool[idx];
  await saveGuitarRecentPick(DEFAULT_USER_ID, picked.title, picked.artist);
  return picked;
}

function buildOfflineLesson(song: GuitarSong): GuitarLesson {
  const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.artist} guitar lesson`)}`;
  const spotifySearch = `https://open.spotify.com/search/${encodeURIComponent(`${song.title} ${song.artist}`)}`;
  return {
    title: song.title,
    artist: song.artist,
    key: 'E minor',
    tuning: 'Standard E A D G B E',
    lyricsWithChords: `Em   C   G   D\n[Practice groove for ${song.title}]`,
    chordChanges: 'Verse: Em-C-G-D | Chorus: G-D-Em-C',
    inspiration: `Start with a slow, steady tempo and focus on clean chord transitions for "${song.title}".`,
    youtubeLessonTitle: `Search YouTube for ${song.title} ${song.artist} guitar lesson`,
    youtubeLessonUrl: youtubeSearch,
    spotifyUrl: spotifySearch,
  };
}

function buildPrompt(song: GuitarSong, dayOfYear: number): string {
  if (song.title && song.artist) {
    return `Create a concise guitar lesson for the specific classic rock song below. Return JSON ONLY with these exact fields. Do not add extra text.\n\nSong: "${song.title}" by "${song.artist}"\n\n{\n  "title": "Song title only",\n  "artist": "Artist name",\n  "key": "Musical key (e.g., A minor, E major)",\n  "tuning": "Guitar tuning (e.g., Standard E A D G B E, Drop D, Eb Standard)",\n  "lyricsWithChords": "Multi-line text with chords inline or above lyrics. Keep it short (intro/verse/chorus). Use plain ASCII.",\n  "chordChanges": "Concise chord progression overview (e.g., Verse: G-D-Em-C | Chorus: C-G-Am-F)",\n  "inspiration": "Song facts about what inspired the song. Make me fall in love with it.",\n  "youtubeLessonTitle": "Best YouTube video title for a guitar lesson on this song",\n  "youtubeLessonUrl": "Direct YouTube URL starting with https:// (must be a watch URL, not Shorts or playlist)",\n  "spotifyUrl": "Direct Spotify track URL starting with https://open.spotify.com/"\n}\n\nRules:\n- Keep lyrics snippet short and fair-use; do not include full lyrics.\n- Ensure URLs are valid-looking and direct. No markdown, no extra commentary.`;
  }
  return `Give me a Random Classic Rock song that I can learn to play on Guitar for day ${dayOfYear} of the year. Return JSON ONLY with these exact fields:\n\n{\n  "title": "Song title only",\n  "artist": "Artist name",\n  "key": "Musical key (e.g., A minor, E major)",\n  "tuning": "Guitar tuning (e.g., Standard E A D G B E, Drop D, Eb Standard)",\n  "lyricsWithChords": "Multi-line text with chords inline or above lyrics. Keep it short (intro/verse/chorus). Use plain ASCII.",\n  "chordChanges": "Concise chord progression overview (e.g., Verse: G-D-Em-C | Chorus: C-G-Am-F)",\n  "inspiration": "Song facts about what inspired the song. Make me fall in love with it.",\n  "youtubeLessonTitle": "Best YouTube video title for a guitar lesson on this song",\n  "youtubeLessonUrl": "Direct YouTube URL starting with https:// (must be a watch URL, not Shorts or playlist)",\n  "spotifyUrl": "Direct Spotify track URL starting with https://open.spotify.com/"\n}\n\nRules:\n- Keep lyrics snippet short and fair-use; do not include full lyrics.\n- Ensure URLs are valid-looking and direct. No markdown, no extra commentary.`;
}

async function fetchGuitarLesson(
  song: GuitarSong,
  dayOfYear: number
): Promise<GuitarLesson | null> {
  const response = await ai.models.generateContent({
    model: 'sonar-pro',
    contents: buildPrompt(song, dayOfYear),
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  try {
    return JSON.parse(response.text) as GuitarLesson;
  } catch (jsonError) {
    console.error('Failed to parse JSON for guitar feature:', jsonError);
    return null;
  }
}

export async function fetchAndShowGuitarTab(activeContentDate: Date) {
  const elements = getModalElements(MODAL_CONFIGS.guitar);
  if (!elements) return;

  showModalWithLoading(elements, MODAL_CONFIGS.guitar.loadingMessage);

  let data: GuitarLesson | null = null;

  try {
    const dayOfYear = getDayOfYear(activeContentDate);
    const recent = await loadGuitarRecentPicks(DEFAULT_USER_ID);
    const songPool = await loadSongPool(activeContentDate);
    const pickedSong = await pickSong(songPool, recent);

    if (!hasApiKey) {
      data = buildOfflineLesson(pickedSong);
    } else {
      data = await fetchGuitarLesson(pickedSong, dayOfYear);
      if (!data) {
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

  setModalContent(elements, renderGuitarLesson(data));
}
