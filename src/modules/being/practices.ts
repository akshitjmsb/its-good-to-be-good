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

/** Tennis-specific dynamic warm-up / stretch routines. */
export const TENNIS_STRETCHES: ReadonlyArray<PracticeLink> = [
  { label: 'No-Kit Warm-Up', url: 'https://www.youtube.com/watch?v=3y1Nm-iRkyE' },
  { label: 'Most Effective', url: 'https://www.youtube.com/watch?v=133Fn1x46NU' },
  { label: 'Pre-Match', url: 'https://www.youtube.com/watch?v=76868blg4o4' },
];

/** Short guided meditation sessions. */
export const GUIDED_MEDITATIONS: ReadonlyArray<PracticeLink> = [
  { label: 'Daily Calm · 10', url: 'https://www.youtube.com/watch?v=ZToicYcHIOU' },
  { label: 'Clear Mind · 10', url: 'https://www.youtube.com/watch?v=uTN29kj7e-w' },
  { label: 'Inner Peace · 10', url: 'https://www.youtube.com/watch?v=xv-ejEOogaA' },
];
