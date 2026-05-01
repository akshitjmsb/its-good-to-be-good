import { escapeHtml } from '../../../utils/escapeHtml';
import { GuitarLesson } from './types';

const safe = (s: string) => escapeHtml((s || '').replace(/\*/g, ''));

function isValidYouTubeUrl(url: string): boolean {
  if (!url) return false;
  const badPatterns = /\/shorts\//i;
  const validPatterns = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/i;
  return validPatterns.test(url) && !badPatterns.test(url);
}

function isLikelyGuitarLesson(title: string, url: string): boolean {
  const t = (title || '').toLowerCase();
  const hasKeywords =
    t.includes('guitar') &&
    (t.includes('lesson') ||
      t.includes('tutorial') ||
      t.includes('how to') ||
      t.includes('tabs'));
  const notLiveOrShorts = !/\blive\b/i.test(t) && !/\/shorts\//i.test(url || '');
  return hasKeywords && notLiveOrShorts;
}

function isValidSpotifyTrackUrl(url: string): boolean {
  return /^(https?:\/\/)?open\.spotify\.com\/track\/[A-Za-z0-9]{22}(\?.*)?$/i.test(
    url || ''
  );
}

export function renderGuitarLesson(data: GuitarLesson): string {
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${data.title} ${data.artist} guitar lesson`)}`;
  const spSearchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${data.title} ${data.artist}`)}`;

  const ytIsUsable =
    isValidYouTubeUrl(data.youtubeLessonUrl) &&
    isLikelyGuitarLesson(data.youtubeLessonTitle, data.youtubeLessonUrl);
  const chosenYouTubeUrl = ytIsUsable ? data.youtubeLessonUrl : ytSearchUrl;
  const chosenYouTubeTitle = ytIsUsable
    ? data.youtubeLessonTitle
    : `Search YouTube for ${data.title} ${data.artist} guitar lesson`;
  const chosenSpotifyUrl = isValidSpotifyTrackUrl(data.spotifyUrl)
    ? data.spotifyUrl
    : spSearchUrl;

  return `
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
}
