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
  ingredients?: string[];
  note?: string;
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
    name: 'Oats with banana and almonds',
    ingredients: ['rolled oats', 'banana', 'almonds', 'cinnamon'],
  },
  {
    name: 'Oats with berries and walnuts',
    ingredients: ['rolled oats', 'mixed berries', 'walnuts'],
  },
  {
    name: 'Greek yogurt with fruit and honey',
    ingredients: ['plain Greek yogurt', 'apple or pear', 'honey', 'pumpkin seeds'],
  },
  {
    name: 'Vegetable poha',
    ingredients: ['flattened rice', 'onion', 'peas', 'peanuts', 'turmeric'],
  },
  {
    name: 'Upma with vegetables',
    ingredients: ['semolina', 'carrot', 'peas', 'mustard seeds', 'curry leaves'],
  },
  {
    name: 'Idli with sambar',
    ingredients: ['idli', 'lentil sambar', 'coconut chutney'],
  },
  {
    name: 'Avocado toast with tomato',
    ingredients: ['whole-grain bread', 'avocado', 'tomato', 'black pepper'],
  },
  {
    name: 'Paneer paratha with curd',
    ingredients: ['whole-wheat paratha', 'paneer', 'plain curd'],
    note: 'Skip the butter on the paratha — a little ghee is enough.',
  },
  {
    name: 'Banana-peanut-butter toast',
    ingredients: ['whole-grain bread', 'peanut butter', 'banana'],
  },
];

const BREAKFAST_NONVEG: ReadonlyArray<Meal> = [
  {
    name: 'Masala omelette with toast',
    ingredients: ['eggs', 'onion', 'green chili', 'tomato', 'whole-grain bread'],
  },
  {
    name: 'Scrambled eggs with spinach',
    ingredients: ['eggs', 'spinach', 'olive oil', 'whole-grain bread'],
  },
  {
    name: 'Boiled eggs with avocado',
    ingredients: ['boiled eggs', 'avocado', 'sea salt', 'black pepper'],
  },
];

/* ── Lunch ─────────────────────────────────────────────────────────── */

const LUNCH_VEG: ReadonlyArray<Meal> = [
  {
    name: 'Dal with rice and roasted vegetables',
    ingredients: ['toor dal', 'brown rice', 'roasted seasonal vegetables'],
  },
  {
    name: 'Rajma chawal with cucumber salad',
    ingredients: ['rajma (kidney beans)', 'basmati rice', 'cucumber', 'onion'],
  },
  {
    name: 'Chana masala with rice',
    ingredients: ['chickpeas', 'tomato', 'onion', 'brown rice'],
  },
  {
    name: 'Vegetable khichdi with curd',
    ingredients: ['moong dal', 'rice', 'carrot', 'peas', 'plain curd'],
    note: 'Easy on the stomach — good for a slow afternoon.',
  },
  {
    name: 'Paneer bhurji with roti',
    ingredients: ['paneer', 'onion', 'tomato', 'whole-wheat roti'],
  },
  {
    name: 'Chickpea salad with olive oil',
    ingredients: ['chickpeas', 'cucumber', 'tomato', 'red onion', 'olive oil', 'lemon'],
  },
  {
    name: 'Vegetable soup with whole-grain bread',
    ingredients: ['mixed vegetables', 'vegetable stock', 'whole-grain bread'],
  },
  {
    name: 'Mixed vegetable curry with quinoa',
    ingredients: ['cauliflower', 'peas', 'carrot', 'quinoa'],
  },
  {
    name: 'Stir-fried tofu with vegetables',
    ingredients: ['firm tofu', 'bell pepper', 'broccoli', 'soy sauce', 'ginger'],
  },
  {
    name: 'Aloo gobi with roti',
    ingredients: ['potato', 'cauliflower', 'turmeric', 'whole-wheat roti'],
  },
];

const LUNCH_NONVEG: ReadonlyArray<Meal> = [
  {
    name: 'Grilled chicken with brown rice and salad',
    ingredients: ['chicken breast', 'brown rice', 'mixed greens', 'olive oil'],
  },
  {
    name: 'Fish curry with rice',
    ingredients: ['white fish', 'coconut milk', 'tomato', 'basmati rice'],
  },
  {
    name: 'Chicken stir-fry with vegetables',
    ingredients: ['chicken breast', 'bell pepper', 'broccoli', 'soy sauce', 'ginger'],
  },
  {
    name: 'Tuna salad on whole-grain bread',
    ingredients: ['canned tuna', 'olive oil', 'onion', 'whole-grain bread', 'lettuce'],
  },
];

/* ── Dinner ────────────────────────────────────────────────────────── */

const DINNER_VEG: ReadonlyArray<Meal> = [
  {
    name: 'Steamed sweet potato with dal',
    ingredients: ['sweet potato', 'masoor dal', 'cumin', 'cilantro'],
  },
  {
    name: 'Vegetable soup with paneer toast',
    ingredients: ['mixed vegetables', 'vegetable stock', 'paneer', 'whole-grain bread'],
  },
  {
    name: 'Saag paneer with roti',
    ingredients: ['spinach', 'paneer', 'garlic', 'whole-wheat roti'],
  },
  {
    name: 'Dal tadka with rice and cucumber',
    ingredients: ['yellow dal', 'cumin', 'rice', 'cucumber'],
  },
  {
    name: 'Tofu and vegetable curry',
    ingredients: ['firm tofu', 'tomato', 'spinach', 'brown rice'],
  },
  {
    name: 'Mixed dal with sautéed greens',
    ingredients: ['mixed lentils', 'spinach or kale', 'garlic', 'olive oil'],
  },
  {
    name: 'Lentil soup with whole-grain bread',
    ingredients: ['red lentils', 'carrot', 'celery', 'whole-grain bread'],
  },
  {
    name: 'Eggplant curry with roti',
    ingredients: ['eggplant', 'tomato', 'onion', 'whole-wheat roti'],
  },
  {
    name: 'Steamed sweet potato with chickpea curry',
    ingredients: ['sweet potato', 'chickpeas', 'tomato', 'cilantro'],
  },
];

const DINNER_NONVEG: ReadonlyArray<Meal> = [
  {
    name: 'Grilled chicken with roasted vegetables',
    ingredients: ['chicken breast', 'broccoli', 'carrot', 'olive oil'],
  },
  {
    name: 'Baked fish with steamed vegetables',
    ingredients: ['white fish', 'lemon', 'broccoli', 'green beans'],
  },
  {
    name: 'Steamed sweet potato with grilled fish',
    ingredients: ['sweet potato', 'salmon or tilapia', 'lemon', 'olive oil'],
  },
  {
    name: 'Chicken and vegetable stir-fry with rice',
    ingredients: ['chicken breast', 'bell pepper', 'snow peas', 'brown rice'],
  },
];

/* ── Snack ─────────────────────────────────────────────────────────── */

const SNACK_VEG: ReadonlyArray<Meal> = [
  {
    name: 'Apple with peanut butter',
    ingredients: ['apple', 'natural peanut butter'],
  },
  {
    name: 'Mixed nuts and a banana',
    ingredients: ['almonds', 'walnuts', 'cashews', 'banana'],
  },
  {
    name: 'Plain yogurt with seeds',
    ingredients: ['plain yogurt', 'pumpkin seeds', 'chia seeds'],
  },
  {
    name: 'Roasted chickpeas (chana)',
    ingredients: ['roasted chickpeas', 'salt', 'chaat masala'],
  },
  {
    name: 'Carrot sticks with hummus',
    ingredients: ['carrots', 'hummus'],
  },
  {
    name: 'Dates with almonds',
    ingredients: ['Medjool dates', 'almonds'],
  },
  {
    name: 'Cottage cheese with cucumber',
    ingredients: ['cottage cheese', 'cucumber', 'black pepper'],
  },
  {
    name: 'A piece of fruit',
    ingredients: ['orange, pear, or banana'],
    note: 'Whatever is in the fridge.',
  },
  {
    name: 'Trail mix',
    ingredients: ['almonds', 'walnuts', 'raisins', 'pumpkin seeds'],
  },
];

const SNACK_NONVEG: ReadonlyArray<Meal> = [
  {
    name: 'Boiled egg with salt',
    ingredients: ['egg', 'salt', 'black pepper'],
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
    return { name: '—' };
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
