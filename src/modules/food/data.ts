/**
 * Curated meal pool — fully offline, no API.
 *
 * Schedule: Tue + Thu are vegetarian (no meat, no fish, no eggs).
 * Other days draw from the combined pool (veg + non-veg items).
 *
 * Per-week variation: each (week-start ISO date, day-of-week, meal
 * category) triple is hashed with djb2 to deterministically shuffle
 * the eligible pool, then the first item becomes that meal. Same week
 * → same meals; different week → different picks. Instant, no network.
 */

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_CATEGORIES: ReadonlyArray<MealCategory> = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
];

export interface Meal {
  name: string;
  components: {
    protein: string;
    fibre: string;
    carb?: string;
  };
}

export interface DayMealPlan {
  vegetarian: boolean;
  meals: Record<MealCategory, Meal>;
}

/** Days of week (0 = Sun) that are vegetarian-only. */
const VEG_WEEKDAYS: ReadonlySet<number> = new Set([2, 4]);

export function isVegDay(date: Date): boolean {
  return VEG_WEEKDAYS.has(date.getDay());
}

/* ── Breakfast ─────────────────────────────────────────────────────── */

const BREAKFAST_VEG: ReadonlyArray<Meal> = [
  {
    name: 'Greek yogurt, banana and oats',
    components: {
      protein: 'Greek yogurt',
      fibre: 'banana + almonds',
      carb: 'oats',
    },
  },
  {
    name: 'Greek yogurt, berries and oats',
    components: {
      protein: 'Greek yogurt',
      fibre: 'berries + walnuts',
      carb: 'oats',
    },
  },
  {
    name: 'Greek yogurt with fruit and seeds',
    components: {
      protein: 'Greek yogurt',
      fibre: 'apple or pear + pumpkin seeds',
    },
  },
  {
    name: 'Poha with paneer and vegetables',
    components: {
      protein: 'paneer',
      fibre: 'peas + onion',
      carb: 'poha',
    },
  },
  {
    name: 'Upma with Greek yogurt and vegetables',
    components: {
      protein: 'Greek yogurt',
      fibre: 'carrot + peas',
      carb: 'upma',
    },
  },
  {
    name: 'Idli with lentil sambar',
    components: {
      protein: 'lentil sambar',
      fibre: 'sambar vegetables',
      carb: 'idli',
    },
  },
  {
    name: 'Paneer, avocado and toast',
    components: {
      protein: 'paneer',
      fibre: 'avocado + tomato',
      carb: 'whole-grain toast',
    },
  },
  {
    name: 'Paneer paratha with curd and cucumber',
    components: {
      protein: 'paneer + curd',
      fibre: 'cucumber',
      carb: 'whole-wheat paratha',
    },
  },
  {
    name: 'Peanut butter, banana and toast',
    components: {
      protein: 'peanut butter',
      fibre: 'banana',
      carb: 'whole-grain toast',
    },
  },
];

const BREAKFAST_NONVEG: ReadonlyArray<Meal> = [
  {
    name: 'Masala omelette with toast',
    components: {
      protein: 'eggs',
      fibre: 'tomato + onion + spinach',
      carb: 'whole-grain toast',
    },
  },
  {
    name: 'Scrambled eggs, spinach and toast',
    components: {
      protein: 'eggs',
      fibre: 'spinach',
      carb: 'whole-grain toast',
    },
  },
  {
    name: 'Boiled eggs with avocado and tomato',
    components: {
      protein: 'boiled eggs',
      fibre: 'avocado + tomato',
    },
  },
];

/* ── Lunch ─────────────────────────────────────────────────────────── */

const LUNCH_VEG: ReadonlyArray<Meal> = [
  {
    name: 'Dal with rice and roasted vegetables',
    components: {
      protein: 'toor dal',
      fibre: 'roasted vegetables',
      carb: 'brown rice',
    },
  },
  {
    name: 'Rajma chawal with cucumber salad',
    components: {
      protein: 'rajma',
      fibre: 'cucumber salad',
      carb: 'rice',
    },
  },
  {
    name: 'Chana masala with vegetables and rice',
    components: {
      protein: 'chana',
      fibre: 'tomato + greens',
      carb: 'rice',
    },
  },
  {
    name: 'Curd and vegetables with moong khichdi',
    components: {
      protein: 'curd + moong dal',
      fibre: 'carrot + peas',
      carb: 'khichdi rice',
    },
  },
  {
    name: 'Paneer bhurji with roti',
    components: {
      protein: 'paneer',
      fibre: 'tomato + onion',
      carb: 'whole-wheat roti',
    },
  },
  {
    name: 'Chickpea salad with olive oil',
    components: {
      protein: 'chickpeas',
      fibre: 'cucumber + tomato + olive oil',
    },
  },
  {
    name: 'Vegetable soup with paneer and bread',
    components: {
      protein: 'paneer',
      fibre: 'vegetable soup',
      carb: 'whole-grain bread',
    },
  },
  {
    name: 'Tofu vegetable curry with quinoa',
    components: {
      protein: 'tofu',
      fibre: 'cauliflower + peas',
      carb: 'quinoa',
    },
  },
  {
    name: 'Stir-fried tofu with vegetables',
    components: {
      protein: 'tofu',
      fibre: 'bell pepper + broccoli',
    },
  },
  {
    name: 'Paneer with gobi and roti',
    components: {
      protein: 'paneer',
      fibre: 'cauliflower',
      carb: 'whole-wheat roti',
    },
  },
];

const LUNCH_NONVEG: ReadonlyArray<Meal> = [
  {
    name: 'Grilled chicken with brown rice and salad',
    components: {
      protein: 'chicken',
      fibre: 'mixed salad + olive oil',
      carb: 'brown rice',
    },
  },
  {
    name: 'Fish curry with rice',
    components: {
      protein: 'fish',
      fibre: 'tomato + greens',
      carb: 'rice',
    },
  },
  {
    name: 'Chicken stir-fry with vegetables',
    components: {
      protein: 'chicken',
      fibre: 'bell pepper + broccoli',
    },
  },
  {
    name: 'Tuna salad on whole-grain bread',
    components: {
      protein: 'tuna',
      fibre: 'lettuce + onion + olive oil',
      carb: 'whole-grain bread',
    },
  },
];

/* ── Dinner ────────────────────────────────────────────────────────── */

const DINNER_VEG: ReadonlyArray<Meal> = [
  {
    name: 'Dal and greens with sweet potato',
    components: {
      protein: 'masoor dal',
      fibre: 'sautéed greens',
      carb: 'sweet potato',
    },
  },
  {
    name: 'Vegetable soup with paneer toast',
    components: {
      protein: 'paneer',
      fibre: 'vegetable soup',
      carb: 'whole-grain toast',
    },
  },
  {
    name: 'Saag paneer with roti',
    components: {
      protein: 'paneer',
      fibre: 'saag',
      carb: 'whole-wheat roti',
    },
  },
  {
    name: 'Dal tadka with rice and cucumber',
    components: {
      protein: 'yellow dal',
      fibre: 'cucumber salad',
      carb: 'rice',
    },
  },
  {
    name: 'Tofu and vegetable curry',
    components: {
      protein: 'tofu',
      fibre: 'tomato + spinach',
      carb: 'brown rice',
    },
  },
  {
    name: 'Mixed dal with sautéed greens',
    components: {
      protein: 'mixed dal',
      fibre: 'spinach or kale + olive oil',
    },
  },
  {
    name: 'Lentil soup with whole-grain bread',
    components: {
      protein: 'lentil soup',
      fibre: 'carrot + celery',
      carb: 'whole-grain bread',
    },
  },
  {
    name: 'Paneer with eggplant curry and roti',
    components: {
      protein: 'paneer',
      fibre: 'eggplant curry',
      carb: 'whole-wheat roti',
    },
  },
  {
    name: 'Chickpea curry and greens with sweet potato',
    components: {
      protein: 'chickpeas',
      fibre: 'tomato + greens',
      carb: 'sweet potato',
    },
  },
];

const DINNER_NONVEG: ReadonlyArray<Meal> = [
  {
    name: 'Grilled chicken with roasted vegetables',
    components: {
      protein: 'chicken',
      fibre: 'broccoli + carrot + olive oil',
    },
  },
  {
    name: 'Baked fish with steamed vegetables',
    components: {
      protein: 'fish',
      fibre: 'broccoli + green beans',
    },
  },
  {
    name: 'Grilled fish and greens with sweet potato',
    components: {
      protein: 'fish',
      fibre: 'greens + olive oil',
      carb: 'sweet potato',
    },
  },
  {
    name: 'Chicken and vegetable stir-fry with rice',
    components: {
      protein: 'chicken',
      fibre: 'bell pepper + snow peas',
      carb: 'brown rice',
    },
  },
];

/* ── Snack ─────────────────────────────────────────────────────────── */

const SNACK_VEG: ReadonlyArray<Meal> = [
  {
    name: 'Apple with peanut butter',
    components: {
      protein: 'peanut butter',
      fibre: 'apple',
    },
  },
  {
    name: 'Greek yogurt with banana and nuts',
    components: {
      protein: 'Greek yogurt',
      fibre: 'banana + mixed nuts',
    },
  },
  {
    name: 'Plain yogurt with berries and seeds',
    components: {
      protein: 'plain yogurt',
      fibre: 'berries + pumpkin seeds',
    },
  },
  {
    name: 'Roasted chickpeas with cucumber',
    components: {
      protein: 'roasted chickpeas',
      fibre: 'cucumber',
    },
  },
  {
    name: 'Carrot sticks with hummus',
    components: {
      protein: 'hummus',
      fibre: 'carrot sticks',
    },
  },
  {
    name: 'Dates with almonds',
    components: {
      protein: 'almonds',
      fibre: 'dates',
    },
  },
  {
    name: 'Cottage cheese with cucumber',
    components: {
      protein: 'cottage cheese',
      fibre: 'cucumber',
    },
  },
  {
    name: 'Greek yogurt with fruit',
    components: {
      protein: 'Greek yogurt',
      fibre: 'orange, pear, or banana',
    },
  },
  {
    name: 'Trail mix',
    components: {
      protein: 'almonds + walnuts',
      fibre: 'raisins + pumpkin seeds',
    },
  },
];

const SNACK_NONVEG: ReadonlyArray<Meal> = [
  {
    name: 'Boiled egg with cucumber and tomato',
    components: {
      protein: 'boiled egg',
      fibre: 'cucumber + tomato',
    },
  },
];

/* ── Pool lookup ───────────────────────────────────────────────────── */

function vegPoolFor(category: MealCategory): ReadonlyArray<Meal> {
  switch (category) {
    case 'breakfast':
      return BREAKFAST_VEG;
    case 'lunch':
      return LUNCH_VEG;
    case 'dinner':
      return DINNER_VEG;
    case 'snack':
      return SNACK_VEG;
  }
}

function nonVegPoolFor(category: MealCategory): ReadonlyArray<Meal> {
  switch (category) {
    case 'breakfast':
      return BREAKFAST_NONVEG;
    case 'lunch':
      return LUNCH_NONVEG;
    case 'dinner':
      return DINNER_NONVEG;
    case 'snack':
      return SNACK_NONVEG;
  }
}

function poolFor(category: MealCategory, vegetarian: boolean): ReadonlyArray<Meal> {
  const veg = vegPoolFor(category);
  if (vegetarian) return veg;
  return [...veg, ...nonVegPoolFor(category)];
}

/* ── Deterministic shuffle (mirrors exercise/data.ts) ──────────────── */

function djb2(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function pickOne(pool: ReadonlyArray<Meal>, seed: number): Meal {
  if (pool.length === 0) {
    // Defensive — every (category, vegetarian) combo has at least one entry.
    return {
      name: '—',
      components: { protein: '—', fibre: '—' },
    };
  }
  const indices = Array.from({ length: pool.length }, (_, i) => i);
  let state = seed === 0 ? 1 : seed;
  for (let i = indices.length - 1; i > 0; i--) {
    state = ((state * 1103515245) + 12345) >>> 0;
    const j = state % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return pool[indices[0]];
}

/** Roll a date back to the prior Sunday at 00:00 local time. */
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
 * Pure function: same input date → same meal plan, forever.
 *
 * The week-start anchor means picks rotate each week. The day-of-week and
 * category are part of the seed so each meal slot varies independently.
 */
export function getDayMealPlan(date: Date): DayMealPlan {
  const vegetarian = isVegDay(date);
  const weekStartKey = isoDayKey(getStartOfWeek(date));
  const dayOfWeek = date.getDay();

  const meals = {} as Record<MealCategory, Meal>;
  for (const category of MEAL_CATEGORIES) {
    const pool = poolFor(category, vegetarian);
    const seed = djb2(`${weekStartKey}|${dayOfWeek}|${category}`);
    meals[category] = pickOne(pool, seed);
  }

  return { vegetarian, meals };
}

/** Exposed for tests. */
export const __INTERNAL = {
  djb2,
  pickOne,
  VEG_WEEKDAYS,
  BREAKFAST_VEG,
  BREAKFAST_NONVEG,
  LUNCH_VEG,
  LUNCH_NONVEG,
  DINNER_VEG,
  DINNER_NONVEG,
  SNACK_VEG,
  SNACK_NONVEG,
};
