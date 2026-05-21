/**
 * The coffee menu — fully offline, no API.
 *
 * 28 drinks across 5 categories. `getTodaysDrink(date)` returns one
 * deterministic pick per local date via djb2; `getMenu()` returns the
 * full grouped menu for the browse view.
 */

export type RecipeCategory = 'espresso' | 'milk' | 'cold' | 'brew' | 'specialty';
export type Difficulty = 'easy' | 'medium' | 'advanced';

export interface Ingredient {
  item: string;
  amount: string;
}

export interface Recipe {
  name: string;
  category: RecipeCategory;
  ingredients: ReadonlyArray<Ingredient>;
  instructions: ReadonlyArray<string>;
  difficulty: Difficulty;
  brewTime: string;
  tip: string;
  origin: string;
}

export const CATEGORY_ORDER: ReadonlyArray<RecipeCategory> = [
  'espresso',
  'milk',
  'cold',
  'brew',
  'specialty',
];

export const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  espresso: 'Espresso',
  milk: 'Milk-based',
  cold: 'Cold',
  brew: 'Brew methods',
  specialty: 'Specialty',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  advanced: 'Advanced',
};

const RECIPES: ReadonlyArray<Recipe> = [
  // ── Espresso family ────────────────────────────────────────────────────
  {
    name: 'Espresso',
    category: 'espresso',
    ingredients: [{ item: 'Freshly ground coffee', amount: '18–20 g' }],
    instructions: [
      'Grind 18–20 g of beans fine, like table salt.',
      'Distribute and tamp evenly with about 30 lb of pressure.',
      'Lock the portafilter in and start the shot — aim for a 25–30 s pour.',
      'You want about 36–40 g of liquid in the cup (a 1:2 ratio).',
    ],
    difficulty: 'medium',
    brewTime: '30 sec',
    tip: 'Watch the pour — a slow, syrupy stream with a hazelnut crema means you nailed it.',
    origin: 'Born in Milan in the early 1900s when Luigi Bezzera patented a machine for fast coffee.',
  },
  {
    name: 'Doppio',
    category: 'espresso',
    ingredients: [{ item: 'Freshly ground coffee', amount: '18–20 g' }],
    instructions: [
      'Same as a single espresso, but pulled into a single cup.',
      'Use the double basket — most modern machines default to this.',
      'Aim for 36–40 g of liquid in 25–30 s.',
    ],
    difficulty: 'easy',
    brewTime: '30 sec',
    tip: 'Almost every "espresso" you order outside Italy is already a doppio.',
    origin: 'Italian for "double" — emerged when machines moved from single-shot to twin-spout heads.',
  },
  {
    name: 'Ristretto',
    category: 'espresso',
    ingredients: [{ item: 'Freshly ground coffee', amount: '18–20 g' }],
    instructions: [
      'Grind a notch finer than your standard espresso.',
      'Pull a shot at a 1:1 ratio: 18 g in, 18–20 g out.',
      'Stop the shot early, around 18–22 s.',
    ],
    difficulty: 'advanced',
    brewTime: '20 sec',
    tip: 'Sweeter and more concentrated than espresso — front-of-tongue sugars without the bitter back.',
    origin: 'Italian for "restricted" — a shorter shot that pulls only the most soluble compounds.',
  },
  {
    name: 'Lungo',
    category: 'espresso',
    ingredients: [{ item: 'Freshly ground coffee', amount: '18–20 g' }],
    instructions: [
      'Grind slightly coarser than standard espresso.',
      'Pull a long shot at roughly 1:3, around 50–60 g out.',
      'Total brew time stretches to 40–50 s.',
    ],
    difficulty: 'advanced',
    brewTime: '45 sec',
    tip: 'Bitter compounds extract last, so a lungo is sharper than its volume suggests.',
    origin: 'Italian for "long" — a longer pour that brings more bitter, woody notes into the cup.',
  },
  {
    name: 'Espresso Macchiato',
    category: 'espresso',
    ingredients: [
      { item: 'Single espresso', amount: '36 g' },
      { item: 'Steamed milk foam', amount: '1 small dollop' },
    ],
    instructions: [
      'Pull a single (or double) espresso into a small cup.',
      'Steam a few ounces of milk just enough for a thick microfoam.',
      'Spoon a dollop of foam onto the espresso to "stain" it.',
    ],
    difficulty: 'medium',
    brewTime: '2 min',
    tip: '"Macchiato" means stained — the foam should look like a small cloud on a dark sky.',
    origin: 'Italian shorthand from the 1980s to distinguish a marked espresso from a regular one.',
  },
  {
    name: 'Americano',
    category: 'espresso',
    ingredients: [
      { item: 'Double espresso', amount: '60 g' },
      { item: 'Hot water', amount: '120–180 ml' },
    ],
    instructions: [
      'Pull a double espresso into a 6–8 oz cup.',
      'Top with hot water (just off the boil) to taste.',
    ],
    difficulty: 'easy',
    brewTime: '1 min',
    tip: 'Add the water after the shot if you want to keep the crema visible.',
    origin: 'Reportedly named by GIs in WWII Italy who diluted local espresso to taste like home.',
  },
  {
    name: 'Long Black',
    category: 'espresso',
    ingredients: [
      { item: 'Double espresso', amount: '60 g' },
      { item: 'Hot water', amount: '120 ml' },
    ],
    instructions: [
      'Pour 120 ml of hot water into the cup first.',
      'Pull a double espresso directly on top.',
      'Do not stir — the crema should float intact.',
    ],
    difficulty: 'easy',
    brewTime: '1 min',
    tip: 'The water-first order is the whole point — it preserves the crema an Americano destroys.',
    origin: 'The Australian / Kiwi answer to the Americano — espresso poured onto water, not water onto espresso.',
  },

  // ── Milk-based ────────────────────────────────────────────────────────
  {
    name: 'Cappuccino',
    category: 'milk',
    ingredients: [
      { item: 'Double espresso', amount: '36 g' },
      { item: 'Whole milk, steamed', amount: '120 ml' },
    ],
    instructions: [
      'Pull a double espresso into a 5–6 oz cup.',
      'Steam 120 ml of whole milk to 60–65 °C with a thick microfoam.',
      'Pour the milk slowly into the center of the espresso, then lift the pitcher to settle the foam on top.',
      'You want roughly equal thirds: espresso, milk, foam.',
    ],
    difficulty: 'medium',
    brewTime: '3 min',
    tip: 'Italians never order one after 11 a.m. — it\'s strictly a breakfast drink at home.',
    origin: 'Named for the Capuchin friars whose brown habits matched the drink\'s color.',
  },
  {
    name: 'Latte',
    category: 'milk',
    ingredients: [
      { item: 'Double espresso', amount: '36 g' },
      { item: 'Whole milk, steamed', amount: '240 ml' },
    ],
    instructions: [
      'Pull a double espresso into an 8–12 oz cup.',
      'Steam 240 ml of milk to ~65 °C with a thin layer of microfoam.',
      'Pour the milk in a steady stream, swirling the pitcher to draw a heart, rosetta, or tulip on the surface.',
    ],
    difficulty: 'medium',
    brewTime: '3 min',
    tip: 'In Italy, ordering a "latte" gets you a glass of warm milk — ask for "caffè latte" if you want espresso in it.',
    origin: 'Italian "caffè e latte" — coffee and milk — named on a 1950s American menu and stuck.',
  },
  {
    name: 'Flat White',
    category: 'milk',
    ingredients: [
      { item: 'Double ristretto', amount: '40 g' },
      { item: 'Whole milk, steamed', amount: '120 ml' },
    ],
    instructions: [
      'Pull a double ristretto into a 5.5 oz cup.',
      'Steam 120 ml of whole milk to a velvety microfoam, no large bubbles.',
      'Pour the milk in low and slow, finishing with a small surface design.',
      'No big foam dome — the surface should sit flat with the rim.',
    ],
    difficulty: 'medium',
    brewTime: '3 min',
    tip: 'If you can hear the steam wand hissing loudly, you started aerating too late.',
    origin: 'Disputed birth in 1980s Sydney or Auckland — coffee culture\'s most fought-over drink.',
  },
  {
    name: 'Latte Macchiato',
    category: 'milk',
    ingredients: [
      { item: 'Single espresso', amount: '36 g' },
      { item: 'Steamed milk', amount: '200 ml' },
    ],
    instructions: [
      'Steam 200 ml of milk into a tall glass with a clear foam layer on top.',
      'Slowly pour a single espresso into the center — it should pierce the foam and layer between the milk below and the foam above.',
      'Do not stir; the layers are the whole point.',
    ],
    difficulty: 'advanced',
    brewTime: '3 min',
    tip: 'The opposite of an espresso macchiato — here the milk is stained with espresso, not the other way around.',
    origin: 'A 1980s Italian invention for non-coffee drinkers who wanted the look of a coffee drink.',
  },
  {
    name: 'Mocha',
    category: 'milk',
    ingredients: [
      { item: 'Double espresso', amount: '36 g' },
      { item: 'Chocolate syrup or melted dark chocolate', amount: '20 g' },
      { item: 'Whole milk, steamed', amount: '180 ml' },
    ],
    instructions: [
      'Stir the chocolate syrup into the bottom of the cup.',
      'Pull a double espresso directly onto the chocolate and stir until smooth.',
      'Top with steamed milk, leaving a small foam layer.',
      'Optional: a thin spiral of chocolate or a dollop of whipped cream on top.',
    ],
    difficulty: 'medium',
    brewTime: '4 min',
    tip: 'Real chocolate (not powder) is the difference between a mocha and a chocolate latte.',
    origin: 'Named for Mocha, the Yemeni port whose beans had a natural cocoa-like note.',
  },
  {
    name: 'White Mocha',
    category: 'milk',
    ingredients: [
      { item: 'Double espresso', amount: '36 g' },
      { item: 'White chocolate sauce', amount: '20 g' },
      { item: 'Whole milk, steamed', amount: '180 ml' },
    ],
    instructions: [
      'Stir the white chocolate sauce into the bottom of the cup.',
      'Pour a double espresso directly onto it and stir until fully dissolved.',
      'Top with steamed milk and a thin foam crown.',
    ],
    difficulty: 'medium',
    brewTime: '4 min',
    tip: 'White chocolate is sweet on its own — go lighter on the sauce than you would for a regular mocha.',
    origin: 'A 1990s American cafe invention to widen the mocha audience to non-cocoa drinkers.',
  },
  {
    name: 'Cortado',
    category: 'milk',
    ingredients: [
      { item: 'Double espresso', amount: '40 g' },
      { item: 'Steamed milk', amount: '40 ml' },
    ],
    instructions: [
      'Pull a double espresso into a 4–4.5 oz glass or cup.',
      'Steam a small amount of milk with minimal foam.',
      'Pour the milk into the espresso at a 1:1 ratio.',
    ],
    difficulty: 'medium',
    brewTime: '2 min',
    tip: 'Skip latte art — a clean white surface is the goal here.',
    origin: 'From Spanish "cortar" (to cut) — the milk cuts the espresso\'s acidity without diluting it.',
  },
  {
    name: 'Gibraltar',
    category: 'milk',
    ingredients: [
      { item: 'Double espresso', amount: '36 g' },
      { item: 'Steamed milk', amount: '50 ml' },
    ],
    instructions: [
      'Pull a double espresso directly into a 4.5 oz Gibraltar (Libbey) glass.',
      'Steam milk with a thin microfoam.',
      'Pour the milk to fill the glass, leaving room for a small surface design.',
    ],
    difficulty: 'medium',
    brewTime: '2 min',
    tip: 'Functionally a cortado in a specific glass — third-wave shorthand for "small milky coffee."',
    origin: 'Coined at Blue Bottle in San Francisco in the late 2000s — named for the glass it\'s served in.',
  },

  // ── Cold ──────────────────────────────────────────────────────────────
  {
    name: 'Cold Brew',
    category: 'cold',
    ingredients: [
      { item: 'Coarse-ground coffee', amount: '100 g' },
      { item: 'Cold filtered water', amount: '800 ml' },
    ],
    instructions: [
      'Combine coffee and water in a sealed container; stir to fully wet the grounds.',
      'Refrigerate for 12–18 hours.',
      'Strain through a fine mesh and a paper filter.',
      'Serve over ice, optionally diluted with milk or water to taste.',
    ],
    difficulty: 'easy',
    brewTime: '12 hr',
    tip: 'Don\'t confuse this with iced coffee — different beast, different process, different flavor.',
    origin: 'Centuries-old in Japan as Kyoto-style; mainstreamed in U.S. cafes around 2010.',
  },
  {
    name: 'Iced Americano',
    category: 'cold',
    ingredients: [
      { item: 'Double espresso', amount: '60 g' },
      { item: 'Cold water', amount: '120 ml' },
      { item: 'Ice', amount: 'fill glass' },
    ],
    instructions: [
      'Fill a tall glass with ice.',
      'Add cold water.',
      'Pull a double espresso directly over the ice.',
    ],
    difficulty: 'easy',
    brewTime: '1 min',
    tip: 'Pulling the espresso last shocks the crema and locks the aroma — pour straight onto the ice.',
    origin: 'A Korean cafe staple year-round; even at -10 °C, "ah-ah" (iced Americano) is the order.',
  },
  {
    name: 'Iced Latte',
    category: 'cold',
    ingredients: [
      { item: 'Double espresso', amount: '36 g' },
      { item: 'Cold milk', amount: '180 ml' },
      { item: 'Ice', amount: 'fill glass' },
    ],
    instructions: [
      'Fill a tall glass with ice.',
      'Pour cold milk over the ice to about 3/4 full.',
      'Pull a double espresso directly over the milk.',
      'Stir gently before drinking.',
    ],
    difficulty: 'easy',
    brewTime: '2 min',
    tip: 'Use whole milk — skim and oat dilute too fast against the ice.',
    origin: 'The hot-drink playbook applied to ice; the layering became a barista signature on Instagram.',
  },

  // ── Brew methods ──────────────────────────────────────────────────────
  {
    name: 'Pour Over (V60)',
    category: 'brew',
    ingredients: [
      { item: 'Medium-fine ground coffee', amount: '20 g' },
      { item: 'Filtered water at 95 °C', amount: '320 ml' },
    ],
    instructions: [
      'Rinse the paper filter with hot water and discard the rinse.',
      'Add 20 g of coffee, level the bed, and place the dripper on a server.',
      'Bloom: pour 40 ml of water in slow circles. Wait 30 seconds.',
      'Pour the remaining 280 ml in two stages, finishing by 2:30.',
      'Total drawdown should land around 3:30–4:00.',
    ],
    difficulty: 'medium',
    brewTime: '4 min',
    tip: 'Bloom for 30 seconds before the main pour — it lets CO₂ escape and stops the bed from clumping.',
    origin: 'Hario released the V60 in 2004; it became the third-wave coffee scene\'s signature dripper.',
  },
  {
    name: 'French Press',
    category: 'brew',
    ingredients: [
      { item: 'Coarse-ground coffee', amount: '30 g' },
      { item: 'Filtered water at 95 °C', amount: '450 ml' },
    ],
    instructions: [
      'Add the grounds to the press.',
      'Pour water over the grounds, saturating evenly.',
      'Stir gently and place the lid on with the plunger up.',
      'Steep for exactly 4 minutes.',
      'Press the plunger down slowly and decant immediately.',
    ],
    difficulty: 'easy',
    brewTime: '4 min',
    tip: 'Pour the moment the timer hits 4:00; one extra minute and it turns bitter.',
    origin: 'Patented in 1929 by Italian designer Attilio Calimani; perfected in France post-war.',
  },
  {
    name: 'AeroPress',
    category: 'brew',
    ingredients: [
      { item: 'Medium-fine ground coffee', amount: '17 g' },
      { item: 'Filtered water at 85 °C', amount: '250 ml' },
    ],
    instructions: [
      'Assemble the AeroPress in inverted (upside-down) position.',
      'Add coffee, then pour water and stir for 10 seconds.',
      'Steep for 1 minute, 30 seconds total.',
      'Cap with a rinsed filter, flip onto a mug, and plunge over 30 seconds.',
    ],
    difficulty: 'medium',
    brewTime: '2 min',
    tip: 'The inverted method gives you full control over the steep before plunging — try it once and you won\'t go back.',
    origin: 'Invented by Stanford engineer Alan Adler in 2005 — designed for one cup at a time.',
  },
  {
    name: 'Moka Pot',
    category: 'brew',
    ingredients: [
      { item: 'Fine-ground coffee', amount: 'fill basket level' },
      { item: 'Cold water', amount: 'to safety valve' },
    ],
    instructions: [
      'Fill the bottom chamber with cold water up to the safety valve.',
      'Fill the basket with coffee, level it, do not tamp.',
      'Assemble and place on low to medium heat.',
      'When you hear the gurgle and see the chamber filling, take it off the heat.',
      'Cool the base under cold water to halt extraction.',
    ],
    difficulty: 'medium',
    brewTime: '5 min',
    tip: 'Take it off the heat as soon as you hear the gurgle — the rest is bitter.',
    origin: 'Invented by Alfonso Bialetti in 1933 — the silver octagon on every Italian stove since.',
  },

  // ── Specialty ─────────────────────────────────────────────────────────
  {
    name: 'Affogato',
    category: 'specialty',
    ingredients: [
      { item: 'Vanilla gelato or ice cream', amount: '1 scoop' },
      { item: 'Single espresso, hot', amount: '36 g' },
    ],
    instructions: [
      'Place a single scoop of gelato in a small bowl or glass.',
      'Pull a hot espresso shot.',
      'Pour the espresso directly over the gelato at the table.',
      'Eat immediately with a spoon, before it melts.',
    ],
    difficulty: 'easy',
    brewTime: '1 min',
    tip: 'Use the cheapest ice cream you have — premium gelato resists the espresso and ruins the contrast.',
    origin: 'Italian for "drowned" — a dessert and an espresso in one cup, traditional after dinner.',
  },
  {
    name: 'Espresso Tonic',
    category: 'specialty',
    ingredients: [
      { item: 'Tonic water, chilled', amount: '120 ml' },
      { item: 'Single or double espresso', amount: '36 g' },
      { item: 'Ice', amount: 'fill glass' },
      { item: 'Lemon or orange peel', amount: '1 twist' },
    ],
    instructions: [
      'Fill a tall glass with ice.',
      'Pour the tonic water over the ice — leave room at the top.',
      'Slowly pour a fresh espresso onto the back of a spoon to layer it on the tonic.',
      'Garnish with a citrus twist.',
    ],
    difficulty: 'medium',
    brewTime: '2 min',
    tip: 'Bright, fruity light-roast espressos work; dark roasts taste muddy here.',
    origin: 'Popularized by Helsingborg\'s Koppi Roasters in 2007 and now a summer cafe staple worldwide.',
  },
  {
    name: 'Irish Coffee',
    category: 'specialty',
    ingredients: [
      { item: 'Hot brewed coffee', amount: '120 ml' },
      { item: 'Irish whiskey', amount: '45 ml' },
      { item: 'Brown sugar', amount: '2 tsp' },
      { item: 'Lightly whipped cream', amount: '30 ml' },
    ],
    instructions: [
      'Warm a stemmed glass with hot water, then discard.',
      'Add the brown sugar and whiskey to the warm glass.',
      'Pour the hot coffee over and stir until the sugar dissolves.',
      'Float the lightly whipped cream on top by pouring slowly over the back of a spoon.',
    ],
    difficulty: 'advanced',
    brewTime: '5 min',
    tip: 'The cream should be just whipped enough to float — fully whipped cream sinks the magic.',
    origin: 'Created in 1943 by Joe Sheridan at Foynes Airport, Ireland, to warm transatlantic flying-boat passengers.',
  },
  {
    name: 'Vietnamese Coffee (Cà Phê Sữa Đá)',
    category: 'specialty',
    ingredients: [
      { item: 'Dark-roast coarse-ground coffee', amount: '15 g' },
      { item: 'Hot water', amount: '90 ml' },
      { item: 'Sweetened condensed milk', amount: '30 ml' },
      { item: 'Ice', amount: 'fill glass' },
    ],
    instructions: [
      'Add the condensed milk to the bottom of a tall glass.',
      'Set a phin filter on top of the glass and add the coffee grounds.',
      'Pour a small amount of hot water to bloom for 30 seconds.',
      'Top up with the rest of the water; let it drip for 4–5 minutes.',
      'Stir to combine, then pour over a glass of ice.',
    ],
    difficulty: 'medium',
    brewTime: '5 min',
    tip: 'The phin drips at its own pace — never push it.',
    origin: 'Vietnamese cafes adopted condensed milk during 19th-century French rule when fresh milk was scarce.',
  },
  {
    name: 'Turkish Coffee',
    category: 'specialty',
    ingredients: [
      { item: 'Pulverized coffee, very fine', amount: '7 g per cup' },
      { item: 'Cold water', amount: '60 ml per cup' },
      { item: 'Sugar (optional)', amount: 'to taste' },
    ],
    instructions: [
      'Combine water, coffee, and sugar in a cezve (ibrik). Stir once and never again.',
      'Place over low heat — patience matters here.',
      'When the foam rises to the top, take it off the heat.',
      'Spoon the foam into the cup, then return the cezve to the heat for a second rise. Pour.',
      'Wait a minute for the grounds to settle before sipping.',
    ],
    difficulty: 'advanced',
    brewTime: '5 min',
    tip: 'Boil three times, never stir. The foam is the soul of the drink.',
    origin: 'Brewed across the Ottoman world for 500 years; UNESCO listed the tradition in 2013.',
  },
  {
    name: 'Cuban Coffee (Cafecito)',
    category: 'specialty',
    ingredients: [
      { item: 'Espresso or moka pot brew', amount: '60 ml' },
      { item: 'White sugar', amount: '2 tsp' },
    ],
    instructions: [
      'Start brewing the espresso.',
      'Add the sugar to a small pitcher or cup.',
      'When the first few drops of espresso emerge, pour them onto the sugar.',
      'Whip vigorously with a spoon until pale, thick, and creamy — this is the espuma.',
      'Pour the rest of the espresso over the espuma and serve in tiny cups.',
    ],
    difficulty: 'medium',
    brewTime: '4 min',
    tip: 'The whipping is what makes it Cuban — without the espuma it\'s just sweet espresso.',
    origin: 'A Havana ritual that traveled with the diaspora to Miami and became South Florida\'s second breakfast.',
  },
];

function djb2(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let sessionDateKey: string | null = null;
let sessionDrink: Recipe | null = null;

/**
 * Today's pick, deterministic per local date. Module-level cache means
 * a tab that re-opens the modal during the day always sees the same
 * drink — no re-rolling between visits.
 */
export function getTodaysDrink(date: Date): Recipe {
  const key = dateKey(date);
  if (sessionDateKey === key && sessionDrink) return sessionDrink;
  sessionDateKey = key;
  sessionDrink = RECIPES[djb2(key) % RECIPES.length];
  return sessionDrink;
}

export function getMenu(): ReadonlyArray<Recipe> {
  return RECIPES;
}

export function getMenuByCategory(): Array<{
  category: RecipeCategory;
  recipes: Recipe[];
}> {
  return CATEGORY_ORDER.map(category => ({
    category,
    recipes: RECIPES.filter(r => r.category === category),
  }));
}

/** Exposed for tests. */
export const __INTERNAL = { djb2, RECIPES };
