/**
 * Curated meal pool — fully offline, no API.
 *
 * Every day draws from Greek- and Indian-inspired plant + animal proteins.
 * Beef is excluded from both the meal pool and the supporting food shelf.
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

export interface FoodShelfCategory {
  label: string;
  foods: ReadonlyArray<FoodShelfItem>;
}

export interface GlycemicIndexReference {
  low: number;
  high?: number;
}

export interface FoodShelfItem {
  name: string;
  gi: GlycemicIndexReference | null;
}

// GI values are reference results from https://glycemicindex.com/gi-search/
// and its FAQ, reviewed 2026-09-01.
// Ranges preserve real variation across preparation, variety, and testing.
// null means GI cannot be measured because the food has no or very little carb.
export const FOOD_SHELF: ReadonlyArray<FoodShelfCategory> = [
  {
    label: 'Protein',
    foods: [
      { name: 'Eggs', gi: null },
      { name: 'Chicken', gi: null },
      { name: 'Fish', gi: null },
      { name: 'Salmon', gi: null },
      { name: 'Tuna', gi: null },
      { name: 'Lamb', gi: null },
      { name: 'Paneer', gi: null },
      { name: 'Tofu', gi: null },
      { name: 'Greek yogurt', gi: { low: 12 } },
      { name: 'Dal', gi: { low: 18, high: 32 } },
      { name: 'Chickpeas', gi: { low: 35, high: 38 } },
      { name: 'Rajma', gi: { low: 23, high: 43 } },
    ],
  },
  {
    label: 'Vegetables / fibre',
    foods: [
      { name: 'Spinach / saag', gi: null },
      { name: 'Greek salad', gi: null },
      { name: 'Broccoli', gi: null },
      { name: 'Gobi', gi: null },
      { name: 'Cucumber', gi: null },
      { name: 'Tomato', gi: null },
      { name: 'Eggplant', gi: null },
      { name: 'Peppers', gi: null },
      { name: 'Okra', gi: null },
      { name: 'Greens', gi: null },
    ],
  },
  {
    label: 'Fat',
    foods: [
      { name: 'Olive oil', gi: null },
      { name: 'Tahini', gi: null },
      { name: 'Nuts', gi: null },
      { name: 'Seeds', gi: null },
      { name: 'Peanut butter', gi: null },
      { name: 'Avocado', gi: null },
      { name: 'Ghee', gi: null },
    ],
  },
  {
    label: 'Carb',
    foods: [
      { name: 'Quinoa', gi: { low: 53 } },
      { name: 'Oats', gi: { low: 55, high: 58 } },
      { name: 'Sweet potato', gi: { low: 46, high: 61 } },
      { name: 'Roti', gi: { low: 63 } },
      { name: 'Pita', gi: { low: 58, high: 69 } },
      { name: 'Upma', gi: { low: 58, high: 71 } },
      { name: 'Poha', gi: { low: 43, high: 74 } },
      { name: 'Rice', gi: { low: 48, high: 80 } },
      { name: 'Potato', gi: { low: 70, high: 80 } },
      { name: 'Idli', gi: { low: 48, high: 85 } },
    ],
  },
  {
    label: 'Fruit — earlier',
    foods: [
      { name: 'Berries', gi: null },
      { name: 'Pear', gi: { low: 33, high: 43 } },
      { name: 'Apple', gi: { low: 44 } },
      { name: 'Orange', gi: { low: 45 } },
      { name: 'Banana', gi: { low: 47, high: 57 } },
    ],
  },
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
  meals: Record<MealCategory, Meal>;
}

/* ── Breakfast ─────────────────────────────────────────────────────── */

const BREAKFAST_PLANT: ReadonlyArray<Meal> = [
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

const BREAKFAST_ANIMAL: ReadonlyArray<Meal> = [
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

const LUNCH_PLANT: ReadonlyArray<Meal> = [
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

const LUNCH_ANIMAL: ReadonlyArray<Meal> = [
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
  {
    name: 'Grilled lamb and Greek salad with pita',
    components: {
      protein: 'lamb',
      fibre: 'cucumber + tomato + olive oil',
      carb: 'whole-grain pita',
    },
  },
  {
    name: 'Chicken tikka and kachumber with roti',
    components: {
      protein: 'chicken tikka',
      fibre: 'cucumber + tomato',
      carb: 'whole-wheat roti',
    },
  },
  {
    name: 'Salmon and Greek salad with potato',
    components: {
      protein: 'salmon',
      fibre: 'Greek salad + olive oil',
      carb: 'potato',
    },
  },
];

/* ── Dinner ────────────────────────────────────────────────────────── */

const DINNER_PLANT: ReadonlyArray<Meal> = [
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

const DINNER_ANIMAL: ReadonlyArray<Meal> = [
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
  {
    name: 'Lamb kebab and roasted vegetables with pita',
    components: {
      protein: 'lamb kebab',
      fibre: 'peppers + eggplant',
      carb: 'whole-grain pita',
    },
  },
  {
    name: 'Salmon and spinach with sweet potato',
    components: {
      protein: 'salmon',
      fibre: 'spinach + olive oil',
      carb: 'sweet potato',
    },
  },
];

/* ── Snack ─────────────────────────────────────────────────────────── */

const SNACK_PLANT: ReadonlyArray<Meal> = [
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

const SNACK_ANIMAL: ReadonlyArray<Meal> = [
  {
    name: 'Boiled egg with cucumber and tomato',
    components: {
      protein: 'boiled egg',
      fibre: 'cucumber + tomato',
    },
  },
];

/* ── Pool lookup ───────────────────────────────────────────────────── */

function plantPoolFor(category: MealCategory): ReadonlyArray<Meal> {
  switch (category) {
    case 'breakfast':
      return BREAKFAST_PLANT;
    case 'lunch':
      return LUNCH_PLANT;
    case 'dinner':
      return DINNER_PLANT;
    case 'snack':
      return SNACK_PLANT;
  }
}

function animalPoolFor(category: MealCategory): ReadonlyArray<Meal> {
  switch (category) {
    case 'breakfast':
      return BREAKFAST_ANIMAL;
    case 'lunch':
      return LUNCH_ANIMAL;
    case 'dinner':
      return DINNER_ANIMAL;
    case 'snack':
      return SNACK_ANIMAL;
  }
}

function poolFor(category: MealCategory): ReadonlyArray<Meal> {
  return [...plantPoolFor(category), ...animalPoolFor(category)];
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
    // Defensive — every category has at least one entry.
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
  const weekStartKey = isoDayKey(getStartOfWeek(date));
  const dayOfWeek = date.getDay();

  const meals = {} as Record<MealCategory, Meal>;
  for (const category of MEAL_CATEGORIES) {
    const pool = poolFor(category);
    const seed = djb2(`${weekStartKey}|${dayOfWeek}|${category}`);
    meals[category] = pickOne(pool, seed);
  }

  return { meals };
}

/** Exposed for tests. */
export const __INTERNAL = {
  djb2,
  pickOne,
  poolFor,
  BREAKFAST_PLANT,
  BREAKFAST_ANIMAL,
  LUNCH_PLANT,
  LUNCH_ANIMAL,
  DINNER_PLANT,
  DINNER_ANIMAL,
  SNACK_PLANT,
  SNACK_ANIMAL,
};
