/**
 * Curated exercise pool — fully offline, no API.
 *
 * Schedule: PPL + Upper rotation, fixed by day-of-week.
 *   Sun rest · Mon push · Tue rest · Wed pull · Thu rest · Fri legs · Sat upper
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
    name: 'Barbell Bench Press',
    muscleGroups: 'Chest, shoulders, triceps',
    sets: '4',
    reps: '6–8',
    rest: '2–3 min',
    instructions:
      'Lie back, plant feet, retract scapulae. Lower bar with control to mid-chest, press up over shoulders.',
    tips: 'Keep wrists stacked over elbows; drive through your heels and upper back, not just your arms.',
  },
  {
    name: 'Overhead Press',
    muscleGroups: 'Shoulders, triceps',
    sets: '4',
    reps: '5–8',
    rest: '2–3 min',
    instructions:
      'Stand braced, bar at front-rack. Press straight up, push head through at lockout, lower under control.',
    tips: 'Squeeze glutes and brace your core to keep the lower back from arching.',
  },
  {
    name: 'Incline Dumbbell Press',
    muscleGroups: 'Upper chest, shoulders',
    sets: '3',
    reps: '8–12',
    rest: '90s',
    instructions:
      'Set bench to 30°. Press dumbbells from chest to lockout, slight inward squeeze at the top.',
    tips: 'Lower slowly — the stretch on the upper chest is where most of the growth happens.',
  },
  {
    name: 'Dumbbell Shoulder Press',
    muscleGroups: 'Shoulders, triceps',
    sets: '3',
    reps: '8–12',
    rest: '90s',
    instructions:
      'Seated or standing, dumbbells at shoulder height. Press up until arms are extended, lower with control.',
    tips: 'Keep elbows slightly forward of the shoulder plane to spare the joint.',
  },
  {
    name: 'Weighted Dips',
    muscleGroups: 'Chest, triceps',
    sets: '3',
    reps: '6–10',
    rest: '90s',
    instructions:
      'Support body on parallel bars, lean forward slightly for chest emphasis, lower until shoulders dip just below elbows, press up.',
    tips: 'If shoulders complain, reduce range of motion or switch to push-ups.',
  },
  {
    name: 'Push-Ups',
    muscleGroups: 'Chest, core, triceps',
    sets: '3',
    reps: 'AMRAP',
    rest: '60s',
    instructions:
      'Hands under shoulders, body straight from heels to head. Lower chest to floor, press back up.',
    tips: 'Pause at the bottom for two seconds to kill momentum and add tension.',
  },
  {
    name: 'Cable Chest Fly',
    muscleGroups: 'Chest',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    instructions:
      'Stand between cables, slight forward lean. Bring handles together in front of chest in a wide arc, control the return.',
    tips: 'Keep a soft elbow bend throughout — this is a stretch movement, not a press.',
  },
  {
    name: 'Lateral Raise',
    muscleGroups: 'Side delts',
    sets: '4',
    reps: '12–15',
    rest: '45–60s',
    instructions:
      'Dumbbells at sides, slight forward lean. Raise to shoulder height, leading with elbows; lower under control.',
    tips: 'Lighter than your ego wants. Strict form beats heavy momentum here every time.',
  },
  {
    name: 'Tricep Rope Pushdown',
    muscleGroups: 'Triceps',
    sets: '3',
    reps: '10–15',
    rest: '60s',
    instructions:
      'Cable rope at chest, elbows pinned at sides. Push down and slightly out at the bottom, control back up.',
    tips: 'Pause for one second at full extension to feel the contraction.',
  },
  {
    name: 'Close-Grip Bench Press',
    muscleGroups: 'Triceps, chest',
    sets: '3',
    reps: '8–12',
    rest: '90s',
    instructions:
      'Hands shoulder-width on the bar, elbows tucked. Lower to lower chest, press straight up.',
    tips: 'Tucked elbows and a slight pause on the chest builds the long-head triceps quickly.',
  },
];

const PULL_POOL: ReadonlyArray<Exercise> = [
  {
    name: 'Pull-Ups',
    muscleGroups: 'Lats, biceps, mid-back',
    sets: '4',
    reps: '6–10',
    rest: '2 min',
    instructions:
      'Hang with shoulder-width grip. Pull until chin clears the bar, lower with full control.',
    tips: 'Initiate the pull by pulling shoulder blades down and back, not by bending elbows first.',
  },
  {
    name: 'Barbell Row',
    muscleGroups: 'Lats, rhomboids, rear delts',
    sets: '4',
    reps: '6–8',
    rest: '2 min',
    instructions:
      'Hinge at hips ~45°, neutral spine. Row bar to lower chest, squeeze, lower under control.',
    tips: 'Keep the bar path tight to your body — bar drifting forward turns this into a back-saver.',
  },
  {
    name: 'Conventional Deadlift',
    muscleGroups: 'Back, hamstrings, glutes, traps',
    sets: '3',
    reps: '3–5',
    rest: '3 min',
    instructions:
      'Bar over mid-foot, shins close. Set lats, drive floor away with legs first, finish by squeezing glutes.',
    tips: 'No round-back hero reps. Drop the set when your form starts to break, not when it has.',
  },
  {
    name: 'Lat Pulldown',
    muscleGroups: 'Lats, biceps',
    sets: '3',
    reps: '8–12',
    rest: '90s',
    instructions:
      'Wide grip, slight backward lean. Pull bar to upper chest, squeeze lats, control the return.',
    tips: 'Lead with elbows down and back, not by yanking the bar with your hands.',
  },
  {
    name: 'Seated Cable Row',
    muscleGroups: 'Mid-back, biceps',
    sets: '3',
    reps: '8–12',
    rest: '90s',
    instructions:
      'Sit tall, neutral spine. Pull handle to lower chest, squeeze shoulder blades, lengthen on the return.',
    tips: 'Don’t rock for momentum. The cleaner the pull, the more your back actually works.',
  },
  {
    name: 'Face Pull',
    muscleGroups: 'Rear delts, upper back',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    instructions:
      'Cable rope at face height. Pull to forehead with elbows high, externally rotating at the end.',
    tips: 'The single best exercise for shoulder health — earn your bench presses with these.',
  },
  {
    name: 'Chin-Ups',
    muscleGroups: 'Lats, biceps',
    sets: '3',
    reps: '6–10',
    rest: '90s',
    instructions:
      'Underhand shoulder-width grip. Pull until chin over bar, slow eccentric on the way down.',
    tips: 'If full reps are too hard, use a band or do slow negatives — both build to the real thing.',
  },
  {
    name: 'T-Bar Row',
    muscleGroups: 'Mid-back, lats',
    sets: '3',
    reps: '8–12',
    rest: '90s',
    instructions:
      'Hinge to ~45°, neutral spine. Row handle to lower chest, control the stretch.',
    tips: 'Pause for one second at the top to hammer the contraction.',
  },
  {
    name: 'Barbell Curl',
    muscleGroups: 'Biceps',
    sets: '3',
    reps: '8–12',
    rest: '60s',
    instructions:
      'Stand tall, elbows at sides. Curl bar with elbows pinned, lower under tension.',
    tips: 'No swing. If the bar is moving but your elbows are too, you’re cheating yourself.',
  },
  {
    name: 'Hammer Curl',
    muscleGroups: 'Biceps, forearms',
    sets: '3',
    reps: '10–15',
    rest: '60s',
    instructions:
      'Dumbbells with neutral grip (palms facing each other). Curl up, control down.',
    tips: 'Hammer grip emphasizes brachialis — the muscle that pushes the biceps up and out.',
  },
];

const LEGS_POOL: ReadonlyArray<Exercise> = [
  {
    name: 'Back Squat',
    muscleGroups: 'Quads, glutes, hamstrings',
    sets: '4',
    reps: '5–8',
    rest: '3 min',
    instructions:
      'Bar on upper traps, feet shoulder-width. Brace, descend until hip crease passes the knee, drive up.',
    tips: 'Knees track over toes. Tightening your upper back makes the bar feel half its weight.',
  },
  {
    name: 'Romanian Deadlift',
    muscleGroups: 'Hamstrings, glutes',
    sets: '3',
    reps: '8–10',
    rest: '2 min',
    instructions:
      'Soft knees, neutral spine. Push hips back, lower bar along legs until you feel hamstring stretch, return.',
    tips: 'Stop the descent when your hamstrings tap out — not when the bar reaches the floor.',
  },
  {
    name: 'Leg Press',
    muscleGroups: 'Quads, glutes',
    sets: '4',
    reps: '8–12',
    rest: '90s',
    instructions:
      'Feet shoulder-width on the platform. Lower until knees are about 90°, press through mid-foot.',
    tips: 'Don’t lock out hard at the top — keep tension on the legs throughout the set.',
  },
  {
    name: 'Bulgarian Split Squat',
    muscleGroups: 'Quads, glutes',
    sets: '3',
    reps: '8–10 each leg',
    rest: '90s',
    instructions:
      'Rear foot on bench, front foot far enough that your front shin stays vertical. Descend straight down, drive up.',
    tips: 'Stagger your stance. If your front knee caves inward, lighten the load and rebuild from there.',
  },
  {
    name: 'Walking Lunges',
    muscleGroups: 'Quads, glutes, hamstrings',
    sets: '3',
    reps: '10 each leg',
    rest: '90s',
    instructions:
      'Step forward, descend until back knee taps floor, push through front heel to next step.',
    tips: 'Long stride for glutes, shorter stride for quads. Both work — pick what you’re training.',
  },
  {
    name: 'Lying Leg Curl',
    muscleGroups: 'Hamstrings',
    sets: '3',
    reps: '10–15',
    rest: '60s',
    instructions:
      'Hips pressed into pad. Curl heels toward glutes, squeeze, control the lengthening.',
    tips: 'Pointed-toe (plantarflexed) hits the hamstring belly hardest.',
  },
  {
    name: 'Leg Extension',
    muscleGroups: 'Quads',
    sets: '3',
    reps: '10–15',
    rest: '60s',
    instructions:
      'Sit back into the pad, extend knees fully, pause, lower under control.',
    tips: 'A one-second hold at the top changes this from junk volume into a real quad builder.',
  },
  {
    name: 'Hip Thrust',
    muscleGroups: 'Glutes',
    sets: '3',
    reps: '8–12',
    rest: '90s',
    instructions:
      'Upper back on bench, bar over hips. Drive hips up to lockout, squeeze glutes, lower with control.',
    tips: 'Tuck the chin and ribs down at the top — fully extending the spine is not the goal here.',
  },
  {
    name: 'Standing Calf Raise',
    muscleGroups: 'Calves',
    sets: '4',
    reps: '12–20',
    rest: '45s',
    instructions:
      'Press up onto the balls of your feet through the full range, pause at the top, lower for a stretch.',
    tips: 'A two-second pause stretched at the bottom is the difference between fluff and growth.',
  },
  {
    name: 'Goblet Squat',
    muscleGroups: 'Quads, glutes',
    sets: '3',
    reps: '10–15',
    rest: '60s',
    instructions:
      'Hold a dumbbell at chest. Squat between the heels, elbows tracking inside the knees.',
    tips: 'A great teaching squat — keep the chest tall and elbows pointed down.',
  },
];

const UPPER_POOL: ReadonlyArray<Exercise> = [
  {
    name: 'Pull-Ups',
    muscleGroups: 'Lats, biceps',
    sets: '3',
    reps: '6–10',
    rest: '90s',
    instructions:
      'Shoulder-width grip. Pull chin clear of the bar, control the descent.',
    tips: 'Quality reps only. If the last reps look messy, stop the set and rest.',
  },
  {
    name: 'Bench Press',
    muscleGroups: 'Chest, shoulders, triceps',
    sets: '3',
    reps: '6–8',
    rest: '2 min',
    instructions:
      'Set up with retracted scapulae and a slight arch. Touch mid-chest, press up.',
    tips: 'Plant your feet hard. The press starts from your foot through your back, then your arms.',
  },
  {
    name: 'Barbell Row',
    muscleGroups: 'Lats, rhomboids',
    sets: '3',
    reps: '8–10',
    rest: '90s',
    instructions:
      'Hinge to ~45°, row to lower chest, squeeze, return under control.',
    tips: 'If your spine is rounding by rep 6, the weight is too heavy.',
  },
  {
    name: 'Overhead Press',
    muscleGroups: 'Shoulders, triceps',
    sets: '3',
    reps: '6–8',
    rest: '2 min',
    instructions:
      'Bar at front-rack, brace hard, press straight up, push head through at lockout.',
    tips: 'A press that travels backward is a press that travels far. Keep it close to your face.',
  },
  {
    name: 'Lat Pulldown',
    muscleGroups: 'Lats',
    sets: '3',
    reps: '10–12',
    rest: '90s',
    instructions:
      'Slight backward lean, pull bar to upper chest, squeeze lats, control the return.',
    tips: 'Think about pulling your elbows into your back pockets.',
  },
  {
    name: 'Incline Dumbbell Press',
    muscleGroups: 'Upper chest',
    sets: '3',
    reps: '8–12',
    rest: '90s',
    instructions:
      'Bench at 30°, dumbbells press from upper chest to lockout.',
    tips: 'Letting the dumbbells drift outside the shoulder line cooks the rotator cuff. Keep them stacked.',
  },
  {
    name: 'Cable Row',
    muscleGroups: 'Mid-back',
    sets: '3',
    reps: '10–12',
    rest: '90s',
    instructions:
      'Sit tall, pull handle to lower chest, squeeze shoulder blades, lengthen on the return.',
    tips: 'Pause one second at the contraction; it’s the difference between rowing and just shrugging.',
  },
  {
    name: 'Dumbbell Shoulder Press',
    muscleGroups: 'Shoulders',
    sets: '3',
    reps: '8–10',
    rest: '90s',
    instructions:
      'Seated, dumbbells at shoulders. Press up to lockout, lower with control.',
    tips: 'Slight inward arc at the top, slight outward arc on the way down.',
  },
  {
    name: 'Face Pull',
    muscleGroups: 'Rear delts, upper back',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    instructions:
      'Pull rope to forehead with elbows high, externally rotate at the end.',
    tips: 'Light weight, strict form. Treat it like a finishing move for shoulder health.',
  },
  {
    name: 'Dumbbell Curl + Tricep Extension',
    muscleGroups: 'Biceps, triceps',
    sets: '3',
    reps: '10–12 each',
    rest: '60s',
    instructions:
      'Superset: curl a dumbbell, then immediately do a one-arm overhead tricep extension. Switch arms each round.',
    tips: 'Pump finisher. Keep elbows locked in place for both halves.',
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

/** Exposed for tests. */
export const __INTERNAL = {
  djb2,
  pickExercises,
  REST_ACTIVITIES,
  PUSH_POOL,
  PULL_POOL,
  LEGS_POOL,
  UPPER_POOL,
};
