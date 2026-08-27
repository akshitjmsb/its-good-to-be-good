/**
 * Curated exercise pool — fully offline, no API.
 *
 * Schedule: PPL + Upper rotation, fixed by day-of-week.
 *   Sun rest · Mon push · Tue rest · Wed pull · Thu rest · Fri legs · Sat upper
 *
 * Equipment available: 10 lb dumbbells, 12.5 lb dumbbells, stretch bands,
 * yoga ball, yoga mat, bodyweight.
 *
 * Per-week variation: each (week-start ISO date, workout type) pair is
 * hashed with djb2 to deterministically shuffle the category pool, then
 * the first three exercises become that day's plan. Same week → same
 * picks; different week → different picks. Instant, no network.
 */

export type WorkoutType = 'push' | 'pull' | 'legs' | 'upper' | 'rest';

export interface Exercise {
  name: string;
  muscleGroups: string;
  equipment: string[];
  sets: string;
  reps: string;
  rest: string;
  instructions: string;
  tips: string;
}

export interface DayPlan {
  type: WorkoutType;
  exercises?: Exercise[];
  activities?: string[];
}

const EXERCISES_PER_DAY = 3;

const REST_ACTIVITIES: ReadonlyArray<string> = [
  'Easy walk, 20–30 minutes',
  'Mobility / stretching, 10 minutes',
  'Foam rolling on tight areas',
  'Hydrate well and eat enough protein',
];

const SCHEDULE: ReadonlyArray<WorkoutType> = [
  'rest',  // Sun
  'push',  // Mon
  'rest',  // Tue
  'pull',  // Wed
  'rest',  // Thu
  'legs',  // Fri
  'upper', // Sat
];

const PUSH_POOL: ReadonlyArray<Exercise> = [
  {
    name: 'Dumbbell Floor Press',
    muscleGroups: 'Chest, triceps',
    equipment: ['dumbbells', 'mat'],
    sets: '4',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Lie on the mat, knees bent. Hold dumbbells at chest height, press up to lockout, lower until triceps touch the floor.',
    tips: 'Use a 3-second negative to maximize time under tension with lighter weight. Pause 1 second on the floor.',
  },
  {
    name: 'Banded Push-Ups',
    muscleGroups: 'Chest, shoulders, triceps',
    equipment: ['bands', 'mat'],
    sets: '3',
    reps: '12–18',
    rest: '60s',
    instructions:
      'Loop band across upper back and under palms. Perform push-ups with full range — chest to floor, arms locked at top.',
    tips: 'The band adds progressive resistance at lockout. Focus on explosive push, slow descent.',
  },
  {
    name: 'Dumbbell Shoulder Press',
    muscleGroups: 'Shoulders, triceps',
    equipment: ['dumbbells'],
    sets: '4',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Standing or seated on yoga ball. Dumbbells at shoulder height, press overhead to full extension, lower with 3-second tempo.',
    tips: 'Squeeze glutes and brace core to protect lower back. Lighter weight means you can go strict and slow.',
  },
  {
    name: 'Band Chest Fly',
    muscleGroups: 'Chest',
    equipment: ['bands'],
    sets: '3',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Anchor band behind you at chest height (door anchor or wrap around a post). Bring handles together in front with a wide arc, squeeze chest, return with control.',
    tips: 'Keep a slight elbow bend. Pause 2 seconds at full contraction to build the mind-muscle connection.',
  },
  {
    name: 'Pike Push-Ups',
    muscleGroups: 'Shoulders, triceps',
    equipment: ['mat', 'bodyweight'],
    sets: '3',
    reps: '10–15',
    rest: '60s',
    instructions:
      'Hands on floor, hips high in an inverted-V. Lower the crown of your head toward the floor between your hands, press back up.',
    tips: 'Elevate feet on the yoga ball for extra difficulty once bodyweight gets easy.',
  },
  {
    name: 'Dumbbell Lateral Raises',
    muscleGroups: 'Side delts',
    equipment: ['dumbbells'],
    sets: '4',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Slight forward lean, dumbbells at sides. Raise to shoulder height leading with elbows, lower with a 3-second negative.',
    tips: 'With 10–12.5 lb, tempo is king. No momentum — pause at the top for 1 second.',
  },
  {
    name: 'Yoga-Ball Dumbbell Press',
    muscleGroups: 'Chest, core, shoulders',
    equipment: ['dumbbells', 'yoga_ball'],
    sets: '3',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Lie back on yoga ball (upper back supported, hips up). Press dumbbells from chest to lockout. The instability forces core engagement.',
    tips: 'Keep hips level with shoulders — sagging hips means your glutes checked out. Slow eccentric, 3 seconds down.',
  },
  {
    name: 'Diamond Push-Ups',
    muscleGroups: 'Triceps, inner chest',
    equipment: ['mat', 'bodyweight'],
    sets: '3',
    reps: '12–18',
    rest: '60s',
    instructions:
      'Hands together under chest forming a diamond shape. Lower chest to hands, press up. Keep elbows close to the body.',
    tips: 'If full diamonds are too hard, widen the hand position slightly and work inward over weeks.',
  },
  {
    name: 'Band Front Raises',
    muscleGroups: 'Front delts',
    equipment: ['bands'],
    sets: '3',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Stand on band, handles in each hand. Raise arms straight in front to shoulder height, lower with control.',
    tips: 'Alternate arms if fatigue hits early. Keep a micro-bend in the elbows to protect the joint.',
  },
  {
    name: 'Dumbbell Arnold Press',
    muscleGroups: 'Shoulders, triceps',
    equipment: ['dumbbells'],
    sets: '3',
    reps: '12–15',
    rest: '60s',
    instructions:
      'Start with dumbbells at chest, palms facing you. Rotate palms outward as you press overhead, reverse on the way down.',
    tips: 'The rotation under load hits all three delt heads. Use a 2-second pause at the top for extra burn.',
  },
];

const PULL_POOL: ReadonlyArray<Exercise> = [
  {
    name: 'Band Rows',
    muscleGroups: 'Lats, rhomboids, biceps',
    equipment: ['bands'],
    sets: '4',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Anchor band at waist height. Pull handles to lower ribs, squeeze shoulder blades together, return with 3-second negative.',
    tips: 'Use a heavier band or double-wrap for more resistance. The squeeze at contraction is where the work happens.',
  },
  {
    name: 'Band Pull-Aparts',
    muscleGroups: 'Rear delts, upper back',
    equipment: ['bands'],
    sets: '4',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Hold band at shoulder width, arms extended in front. Pull apart until band touches chest, control the return.',
    tips: 'Keep arms straight — this is a shoulder blade movement, not an arm movement. Pause 1 second at full stretch.',
  },
  {
    name: 'Dumbbell Bent-Over Rows',
    muscleGroups: 'Lats, rhomboids, biceps',
    equipment: ['dumbbells'],
    sets: '4',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Hinge at hips to 45°, neutral spine. Row dumbbells to lower ribs, squeeze, lower with a 3-second eccentric.',
    tips: 'With lighter weight, slow the tempo way down and focus on a hard squeeze at the top. Try 1.5 reps (full pull, half lower, re-pull, full lower).',
  },
  {
    name: 'Band Face Pulls',
    muscleGroups: 'Rear delts, rotator cuff, upper back',
    equipment: ['bands'],
    sets: '3',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Anchor band at face height. Pull toward forehead with elbows high, externally rotate at the end so fists point to ceiling.',
    tips: 'The single best exercise for shoulder health. Light resistance, perfect form, every pull day.',
  },
  {
    name: 'Band Bicep Curls',
    muscleGroups: 'Biceps',
    equipment: ['bands'],
    sets: '3',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Stand on band, handles in each hand. Curl up with elbows pinned at sides, lower with a slow 3-second descent.',
    tips: 'Band resistance increases through the range — the top is hardest. Squeeze hard at peak contraction.',
  },
  {
    name: 'Dumbbell Hammer Curls',
    muscleGroups: 'Biceps, brachialis, forearms',
    equipment: ['dumbbells'],
    sets: '3',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Neutral grip (palms facing each other). Curl up keeping wrists locked, lower with 3-second negative.',
    tips: 'Alternate arms for focus or do both together for efficiency. No swing — strict and slow wins.',
  },
  {
    name: 'Dumbbell Reverse Fly',
    muscleGroups: 'Rear delts, upper back',
    equipment: ['dumbbells', 'mat'],
    sets: '3',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Hinge forward to nearly parallel with floor. Raise dumbbells out to the sides with a slight elbow bend, lower with control.',
    tips: 'Lead with elbows, not hands. Lighter weight forces perfect form — that is the point.',
  },
  {
    name: 'Band High Pulls',
    muscleGroups: 'Upper back, rear delts, traps',
    equipment: ['bands'],
    sets: '3',
    reps: '12–15',
    rest: '60s',
    instructions:
      'Stand on band, handles in each hand. Pull up and out to the sides, elbows high, until hands reach chin height.',
    tips: 'Think of pulling your elbows to the ceiling. Pause at the top for 1 second.',
  },
  {
    name: 'Prone Y-Raises',
    muscleGroups: 'Lower traps, rear delts',
    equipment: ['mat', 'dumbbells'],
    sets: '3',
    reps: '12–15',
    rest: '45s',
    instructions:
      'Lie face down on mat. With light dumbbells (or bodyweight), raise arms at a Y-angle overhead, thumbs pointing up. Lower with control.',
    tips: 'These are humbling — even 10 lb may be heavy. Drop to bodyweight if form breaks and build up.',
  },
  {
    name: 'Dumbbell Shrugs',
    muscleGroups: 'Traps',
    equipment: ['dumbbells'],
    sets: '4',
    reps: '20–25',
    rest: '45s',
    instructions:
      'Hold dumbbells at sides. Shrug shoulders straight up toward ears, hold for 2 seconds at the top, lower slowly.',
    tips: 'High reps with a hard squeeze compensate for lighter weight. No rolling — straight up and down only.',
  },
];

const LEGS_POOL: ReadonlyArray<Exercise> = [
  {
    name: 'Goblet Squats',
    muscleGroups: 'Quads, glutes',
    equipment: ['dumbbells'],
    sets: '4',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Hold one dumbbell vertically at chest. Squat deep with elbows tracking inside the knees, drive through heels.',
    tips: 'Use a 3-second descent and 1-second pause at the bottom. Tempo makes light weight brutal.',
  },
  {
    name: 'Banded Squats',
    muscleGroups: 'Quads, glutes',
    equipment: ['bands'],
    sets: '3',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Loop band under feet and over shoulders (or hold at chest). Squat to parallel or below, press up against band resistance.',
    tips: 'Band resistance peaks at the top — really drive through lockout and squeeze glutes hard.',
  },
  {
    name: 'Yoga-Ball Hamstring Curls',
    muscleGroups: 'Hamstrings, glutes',
    equipment: ['yoga_ball', 'mat'],
    sets: '3',
    reps: '12–15',
    rest: '60s',
    instructions:
      'Lie on back, heels on yoga ball. Lift hips up, then curl the ball toward your glutes by bending knees. Extend back out without dropping hips.',
    tips: 'Keep hips elevated the entire time. For extra difficulty, do single-leg curls.',
  },
  {
    name: 'Bulgarian Split Squats',
    muscleGroups: 'Quads, glutes',
    equipment: ['dumbbells', 'bodyweight'],
    sets: '3',
    reps: '12–15 each leg',
    rest: '60s',
    instructions:
      'Rear foot elevated on a chair or couch. Hold dumbbells at sides. Lower straight down until back knee nearly touches floor, drive up.',
    tips: 'Keep your front shin as vertical as possible. The deeper you go, the more glute you recruit.',
  },
  {
    name: 'Banded Hip Thrusts',
    muscleGroups: 'Glutes',
    equipment: ['bands', 'mat'],
    sets: '4',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Sit on floor, upper back against couch/bench, band across hips (anchored under feet). Drive hips to full extension, squeeze glutes 2 seconds at top.',
    tips: 'Tuck chin and ribs at the top — full hip extension without arching the lower back.',
  },
  {
    name: 'Single-Leg Deadlifts',
    muscleGroups: 'Hamstrings, glutes, balance',
    equipment: ['dumbbells'],
    sets: '3',
    reps: '12–15 each leg',
    rest: '60s',
    instructions:
      'Hold dumbbell in opposite hand to standing leg. Hinge forward, free leg extending behind you, until torso is nearly parallel. Return to standing.',
    tips: 'Think about pushing your heel to the wall behind you. The balance challenge is half the benefit.',
  },
  {
    name: 'Calf Raises',
    muscleGroups: 'Calves',
    equipment: ['dumbbells', 'bodyweight'],
    sets: '4',
    reps: '20–25',
    rest: '30s',
    instructions:
      'Stand on the edge of a step or flat floor holding dumbbells. Rise onto balls of feet, hold 2 seconds, lower slowly for a full stretch.',
    tips: 'A 2-second pause stretched at the bottom is what actually grows calves. High reps, slow tempo.',
  },
  {
    name: 'Wall Sits',
    muscleGroups: 'Quads, endurance',
    equipment: ['bodyweight'],
    sets: '3',
    reps: '45–60 seconds',
    rest: '60s',
    instructions:
      'Back flat against wall, slide down until thighs are parallel to floor. Hold. Breathe steadily.',
    tips: 'If 60 seconds is easy, hold a dumbbell on your lap or try single-leg wall sits.',
  },
  {
    name: 'Banded Lateral Walks',
    muscleGroups: 'Glute medius, hip abductors',
    equipment: ['bands'],
    sets: '3',
    reps: '15 each direction',
    rest: '45s',
    instructions:
      'Loop band around ankles or just above knees. Quarter-squat position. Step laterally, maintaining tension on the band throughout.',
    tips: 'Keep toes pointed forward, not outward. The burn should be on the outer hip, not the thighs.',
  },
  {
    name: 'Sumo Squats',
    muscleGroups: 'Inner thighs, glutes, quads',
    equipment: ['dumbbells'],
    sets: '3',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Wide stance, toes pointed out 45°. Hold dumbbell vertically between legs. Squat deep, keeping chest tall, drive up through heels.',
    tips: 'Pulse at the bottom for 3 mini-reps before standing up to add extra time under tension.',
  },
];

const UPPER_POOL: ReadonlyArray<Exercise> = [
  {
    name: 'Dumbbell Curl-to-Press',
    muscleGroups: 'Biceps, shoulders',
    equipment: ['dumbbells'],
    sets: '3',
    reps: '12–15',
    rest: '60s',
    instructions:
      'Curl dumbbells to shoulders, then immediately press overhead. Lower back to shoulders, then uncurl to sides. That is one rep.',
    tips: 'Smooth transition between curl and press — no rest at the shoulders. Great total-arm compound.',
  },
  {
    name: 'Band Lateral Raises',
    muscleGroups: 'Side delts',
    equipment: ['bands'],
    sets: '4',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Stand on band, handles in each hand. Raise arms to shoulder height, pause 1 second, lower with control.',
    tips: 'Band gives increasing resistance at the top where delts work hardest. No momentum.',
  },
  {
    name: 'Yoga-Ball Plank',
    muscleGroups: 'Core, shoulders',
    equipment: ['yoga_ball'],
    sets: '3',
    reps: '30–45 seconds',
    rest: '45s',
    instructions:
      'Forearms on yoga ball, body in a straight line. Hold the position, fighting the instability of the ball.',
    tips: 'If it feels easy, try small circles with your elbows on the ball — the stabilization demand skyrockets.',
  },
  {
    name: 'Push-Up to Dumbbell Row',
    muscleGroups: 'Chest, lats, core',
    equipment: ['dumbbells', 'mat'],
    sets: '3',
    reps: '10–12 (5–6 each side)',
    rest: '60s',
    instructions:
      'Push-up position with hands on dumbbells. Do a push-up, then row one dumbbell to your hip. Push-up again, row the other side.',
    tips: 'Widen your feet for balance. Keep hips square to the floor during rows — no rotation.',
  },
  {
    name: 'Band Tricep Pushdowns',
    muscleGroups: 'Triceps',
    equipment: ['bands'],
    sets: '3',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Anchor band high (top of door frame). Grip handles, elbows pinned at sides. Push down to full arm extension, squeeze, return slowly.',
    tips: 'Pause 1 second at full extension. The constant tension from bands is actually superior to cables here.',
  },
  {
    name: 'Dumbbell Concentration Curls',
    muscleGroups: 'Biceps',
    equipment: ['dumbbells'],
    sets: '3',
    reps: '15–20 each arm',
    rest: '45s',
    instructions:
      'Seated, elbow braced against inner thigh. Curl dumbbell with strict form — no body English. Lower with 3-second negative.',
    tips: 'The brace eliminates cheating. Squeeze hard at the top, supinate (twist pinky up) for peak contraction.',
  },
  {
    name: 'Band Overhead Press',
    muscleGroups: 'Shoulders, triceps',
    equipment: ['bands'],
    sets: '3',
    reps: '15–20',
    rest: '60s',
    instructions:
      'Stand on band, handles at shoulders. Press straight overhead to lockout, lower with control.',
    tips: 'Band resistance peaks at lockout — great for building shoulder stability at full extension.',
  },
  {
    name: 'Yoga-Ball Rollouts',
    muscleGroups: 'Core, lats',
    equipment: ['yoga_ball', 'mat'],
    sets: '3',
    reps: '10–15',
    rest: '60s',
    instructions:
      'Kneel behind yoga ball, forearms on top. Roll the ball forward extending your body, then pull back using your core. Maintain flat back throughout.',
    tips: 'Only go as far as you can maintain a neutral spine. Range will increase as your core strengthens.',
  },
  {
    name: 'Dumbbell Kickbacks',
    muscleGroups: 'Triceps',
    equipment: ['dumbbells'],
    sets: '3',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Hinge forward, upper arms parallel to torso. Extend forearms back to lockout, squeeze triceps, lower with 3-second negative.',
    tips: 'Lock your upper arm in place — the only joint moving is the elbow. Hold lockout for 1 second.',
  },
  {
    name: 'Banded Pull-Aparts (Upper Day)',
    muscleGroups: 'Rear delts, upper back',
    equipment: ['bands'],
    sets: '3',
    reps: '15–20',
    rest: '45s',
    instructions:
      'Band at shoulder width, arms extended. Pull apart until band contacts chest, hold 1 second, return with control.',
    tips: 'Great posture corrector and shoulder prehab. Light resistance, high reps, perfect form.',
  },
];

function djb2(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function pickExercises(
  pool: ReadonlyArray<Exercise>,
  seed: number,
  count: number
): Exercise[] {
  const indices = Array.from({ length: pool.length }, (_, i) => i);
  // Fisher-Yates seeded by `seed` advanced through a small LCG.
  let state = seed === 0 ? 1 : seed;
  for (let i = indices.length - 1; i > 0; i--) {
    state = ((state * 1103515245) + 12345) >>> 0;
    const j = state % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map(i => pool[i]);
}

function poolFor(type: WorkoutType): ReadonlyArray<Exercise> {
  switch (type) {
    case 'push':
      return PUSH_POOL;
    case 'pull':
      return PULL_POOL;
    case 'legs':
      return LEGS_POOL;
    case 'upper':
      return UPPER_POOL;
    case 'rest':
      return [];
  }
}

/**
 * Roll a date back to the prior Sunday at 00:00 local time.
 */
export function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function isoDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Pure function: same input date → same plan, forever.
 */
export function getDayPlan(date: Date): DayPlan {
  const type = SCHEDULE[date.getDay()];
  if (type === 'rest') {
    return { type, activities: [...REST_ACTIVITIES] };
  }
  const weekStart = getStartOfWeek(date);
  const seed = djb2(`${isoDayKey(weekStart)}|${type}`);
  return {
    type,
    exercises: pickExercises(poolFor(type), seed, EXERCISES_PER_DAY),
  };
}

/* ── Stretch routines ───────────────────────────────────────────────────── */

export interface StretchEntry {
  bodyPart: string;
  urls: string[];
}

export interface StretchLink {
  label: string;
  url: string;
}

/**
 * Curated stretch videos — each body part links directly to a YouTube
 * routine. Multiple URLs per body part render as numbered buttons
 * (e.g. Back 1, Back 2, Back 3). Add new entries here; the UI picks
 * them up automatically.
 */
export const STRETCH_ROUTINES: ReadonlyArray<StretchEntry> = [
  { bodyPart: 'Face', urls: ['https://youtu.be/4SBoTzwSQB8?si=eVdeleAjxE5AkDU7'] },
  { bodyPart: 'Back', urls: [
    'https://youtu.be/2eA2Koq6pTI?si=HEJIOmfT4CDQOkEF',
    'https://youtu.be/ni-3HCfAUnk?si=WuWmFIj2X_3YHtCD',
    'https://youtu.be/HzXkMnvqojE?si=mtKPBZGTlHYHyf6Z',
  ]},
];

export function getStretchLinks(): StretchLink[] {
  return STRETCH_ROUTINES.flatMap(entry =>
    entry.urls.length === 1
      ? [{ label: entry.bodyPart, url: entry.urls[0] }]
      : entry.urls.map((url, index) => ({
          label: `${entry.bodyPart} ${index + 1}`,
          url,
        }))
  );
}

/** One deterministic curated stretch per local calendar day. */
export function getStretchNow(date: Date): StretchLink | null {
  const links = getStretchLinks();
  if (links.length === 0) return null;
  const localDay = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
  return links[localDay % links.length];
}

/* ── Muscle focus per workout type ──────────────────────────────────────── */

export interface MuscleGroup {
  name: string;
  role: 'primary' | 'secondary';
}

export const MUSCLE_FOCUS: Record<Exclude<WorkoutType, 'rest'>, MuscleGroup[]> = {
  push: [
    { name: 'Chest', role: 'primary' },
    { name: 'Shoulders', role: 'primary' },
    { name: 'Triceps', role: 'secondary' },
  ],
  pull: [
    { name: 'Back', role: 'primary' },
    { name: 'Biceps', role: 'primary' },
    { name: 'Rear delts', role: 'secondary' },
    { name: 'Traps', role: 'secondary' },
  ],
  legs: [
    { name: 'Quads', role: 'primary' },
    { name: 'Glutes', role: 'primary' },
    { name: 'Hamstrings', role: 'primary' },
    { name: 'Calves', role: 'secondary' },
  ],
  upper: [
    { name: 'Shoulders', role: 'primary' },
    { name: 'Biceps', role: 'primary' },
    { name: 'Triceps', role: 'primary' },
    { name: 'Core', role: 'secondary' },
    { name: 'Upper back', role: 'secondary' },
  ],
};

/** Exposed for tests. */
export const __INTERNAL = {
  djb2,
  pickExercises,
  REST_ACTIVITIES,
  PUSH_POOL,
  PULL_POOL,
  LEGS_POOL,
  UPPER_POOL,
  STRETCH_ROUTINES,
  MUSCLE_FOCUS,
};
