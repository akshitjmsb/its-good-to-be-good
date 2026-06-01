/**
 * Curated practice links for the Being dock.
 *
 * Each entry opens a YouTube routine in a new tab — same treatment as the
 * stretch routines in `exercise-data.ts`. Add or swap URLs here; the dock
 * panels pick them up automatically.
 */

export interface PracticeLink {
  label: string;
  url: string;
}

/** A YouTube channel worth following — name, one-line note, channel link. */
export interface ChannelLink {
  name: string;
  note: string;
  url: string;
}

/** Tennis-specific dynamic warm-up / stretch routines. */
export const TENNIS_STRETCHES: ReadonlyArray<PracticeLink> = [
  { label: 'No-Kit Warm-Up', url: 'https://www.youtube.com/watch?v=3y1Nm-iRkyE' },
  { label: 'Most Effective', url: 'https://www.youtube.com/watch?v=133Fn1x46NU' },
  { label: 'Pre-Match', url: 'https://www.youtube.com/watch?v=76868blg4o4' },
];

/** Curated tennis YouTube channels — watch & learn, opens the channel direct. */
export const TENNIS_CHANNELS: ReadonlyArray<ChannelLink> = [
  { name: 'Tennis TV', note: 'Official ATP tour highlights & full matches', url: 'https://www.youtube.com/@TennisTV' },
  { name: 'Functional Tennis', note: 'Drills and technique tips', url: 'https://www.youtube.com/@FunctionalTennis' },
  { name: 'Essential Tennis', note: 'Beginner to intermediate lessons', url: 'https://www.youtube.com/@essentialtennis' },
  { name: 'Top Tennis Training', note: 'Advanced strategy and tactics', url: 'https://www.youtube.com/@TopTennisTraining' },
  { name: 'The Tennis Mentor', note: 'Mental game and match play', url: 'https://www.youtube.com/@TheTennisMentor' },
  { name: 'Feel Tennis', note: 'Modern technique breakdowns', url: 'https://www.youtube.com/@FeelTennis' },
];

/** Short guided meditation sessions. */
export const GUIDED_MEDITATIONS: ReadonlyArray<PracticeLink> = [
  { label: 'Daily Calm · 10', url: 'https://www.youtube.com/watch?v=ZToicYcHIOU' },
  { label: 'Clear Mind · 10', url: 'https://www.youtube.com/watch?v=uTN29kj7e-w' },
  { label: 'Inner Peace · 10', url: 'https://www.youtube.com/watch?v=xv-ejEOogaA' },
];
