/**
 * Hand-drawn line-art SVGs for each drink in the coffee menu.
 *
 * Style: 56-unit square viewBox, `currentColor` strokes, no fills (or a
 * single subtle #f8f9fa fill on glass interiors), 1.5 px stroke weight,
 * round caps and joins — same minimal aesthetic as the homepage logo.
 *
 * Categories share visual language (demitasse for espresso family,
 * mug for milk-based, tall glass with ice for cold) with small
 * differentiators per drink (foam swirls, hearts, ice, straw, layers,
 * unique equipment silhouettes).
 */

const STEAM_3 = '<path d="M22 10c-1 2 1 4 0 6"/><path d="M28 8c-1 2.5 1 4.5 0 6.5"/><path d="M34 10c-1 2 1 4 0 6"/>';
const STEAM_3_HIGH = '<path d="M22 6c-1 2 1 4 0 6"/><path d="M28 4c-1 2.5 1 4.5 0 6.5"/><path d="M34 6c-1 2 1 4 0 6"/>';

function svg(content: string): string {
  return `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
}

// ── Espresso family — small demitasse cup, saucer, steam ────────────────
const ESPRESSO = svg(
  `${STEAM_3}` +
    '<path d="M19 22h18v8c0 5-3 8-9 8s-9-3-9-8z"/>' +
    '<path d="M37 25c3.5 0 3.5 5.5 0 5.5"/>' +
    '<ellipse cx="28" cy="44" rx="15" ry="2"/>'
);

const RISTRETTO = svg(
  `${STEAM_3}` +
    '<path d="M21 24h14v6c0 4-2 6-7 6s-7-2-7-6z"/>' +
    '<path d="M35 26c3 0 3 4 0 4"/>' +
    '<ellipse cx="28" cy="42" rx="13" ry="2"/>'
);

const LUNGO = svg(
  `${STEAM_3_HIGH}` +
    '<path d="M19 18h18v14c0 6-3 9-9 9s-9-3-9-9z"/>' +
    '<path d="M37 22c4 0 4 7 0 7"/>' +
    '<ellipse cx="28" cy="46" rx="15" ry="2"/>'
);

const ESPRESSO_MACCHIATO = svg(
  `${STEAM_3}` +
    '<path d="M19 22h18v8c0 5-3 8-9 8s-9-3-9-8z"/>' +
    '<path d="M37 25c3.5 0 3.5 5.5 0 5.5"/>' +
    '<ellipse cx="28" cy="44" rx="15" ry="2"/>' +
    // foam dollop on the rim
    '<circle cx="28" cy="20" r="2.5"/>'
);

const AMERICANO = svg(
  `${STEAM_3_HIGH}` +
    // taller, narrower cup (no saucer)
    '<path d="M18 16h20v22c0 3-2 4-5 4h-10c-3 0-5-1-5-4z"/>' +
    '<path d="M38 22c4 0 4 8 0 8"/>'
);

const LONG_BLACK = svg(
  `${STEAM_3_HIGH}` +
    // similar to Americano but with the tell-tale undisturbed crema line
    '<path d="M18 16h20v22c0 3-2 4-5 4h-10c-3 0-5-1-5-4z"/>' +
    '<path d="M38 22c4 0 4 8 0 8"/>' +
    '<path d="M20 22h16"/>'
);

// ── Milk-based — mug + steam, with surface art per drink ────────────────
const MUG_BODY =
  '<path d="M16 14h22v22c0 4-2 6-5 6h-12c-3 0-5-2-5-6z"/>' +
  '<path d="M38 18c5 0 5 8 0 8"/>';

const CAPPUCCINO = svg(
  `${STEAM_3_HIGH}${MUG_BODY}` +
    // foam mound (slightly raised cap)
    '<path d="M19 17q8 -3 16 0"/>'
);

const LATTE = svg(
  `${STEAM_3_HIGH}${MUG_BODY}` +
    // rosetta leaf hint
    '<path d="M27 18 Q22 22 27 26 Q32 22 27 18"/>' +
    '<path d="M24 22h6"/>'
);

const FLAT_WHITE = svg(
  `${STEAM_3_HIGH}${MUG_BODY}` +
    // small heart sat in the foam
    '<path d="M27 24c-1.5 -2 -4 -1.2 -4 0.8 0 2 4 3.5 4 3.5s4 -1.5 4 -3.5c0 -2 -2.5 -2.8 -4 -0.8z"/>'
);

const MOCHA = svg(
  `${STEAM_3_HIGH}${MUG_BODY}` +
    // cocoa dust dots
    '<circle cx="22" cy="20" r="0.9"/>' +
    '<circle cx="27" cy="18" r="0.9"/>' +
    '<circle cx="32" cy="20" r="0.9"/>' +
    '<circle cx="25" cy="23" r="0.9"/>' +
    '<circle cx="30" cy="23" r="0.9"/>'
);

const WHITE_MOCHA = svg(
  `${STEAM_3_HIGH}${MUG_BODY}` +
    // lighter, fewer dots
    '<circle cx="24" cy="21" r="0.7"/>' +
    '<circle cx="30" cy="21" r="0.7"/>' +
    '<circle cx="27" cy="24" r="0.7"/>'
);

const LATTE_MACCHIATO = svg(
  `${STEAM_3_HIGH}` +
    // tall straight glass
    '<path d="M19 12h18l-2 30c0 2 -2 3 -4 3h-6c-2 0 -4 -1 -4 -3z"/>' +
    // three liquid layers
    '<path d="M21 22h14"/>' +
    '<path d="M21 28h14"/>'
);

const CORTADO = svg(
  `${STEAM_3}` +
    // small straight-sided rocks glass
    '<path d="M20 22h16v14c0 2 -2 3 -4 3h-8c-2 0 -4 -1 -4 -3z"/>' +
    // liquid line
    '<path d="M22 28h12"/>'
);

const GIBRALTAR = svg(
  `${STEAM_3}` +
    // shorter tumbler with a slight taper
    '<path d="M20 24h16l-1 12c0 2 -2 3 -4 3h-6c-2 0 -4 -1 -4 -3z"/>' +
    '<path d="M22 30h12"/>'
);

// ── Cold — tall glass with ice cubes ────────────────────────────────────
const COLD_BREW = svg(
  // tall glass
  '<path d="M16 12h24l-2 36c0 2 -2 3 -4 3h-12c -2 0 -4 -1 -4 -3z"/>' +
    // ice cubes
    '<rect x="20" y="20" width="6" height="6" rx="1"/>' +
    '<rect x="28" y="26" width="5" height="5" rx="1"/>' +
    '<rect x="22" y="32" width="6" height="6" rx="1"/>'
);

const ICED_AMERICANO = svg(
  '<path d="M16 12h24l-2 36c0 2 -2 3 -4 3h-12c -2 0 -4 -1 -4 -3z"/>' +
    // crema line near the top
    '<path d="M18 18h20"/>' +
    '<rect x="20" y="22" width="6" height="6" rx="1"/>' +
    '<rect x="28" y="28" width="5" height="5" rx="1"/>' +
    '<rect x="22" y="34" width="6" height="6" rx="1"/>'
);

const ICED_LATTE = svg(
  '<path d="M16 14h24l-2 34c0 2 -2 3 -4 3h-12c -2 0 -4 -1 -4 -3z"/>' +
    // straw
    '<path d="M30 6l-3 14"/>' +
    '<rect x="20" y="22" width="6" height="6" rx="1"/>' +
    '<rect x="28" y="30" width="5" height="5" rx="1"/>' +
    '<rect x="22" y="36" width="6" height="6" rx="1"/>'
);

// ── Brew methods — equipment silhouettes ────────────────────────────────
const POUR_OVER = svg(
  // V60 cone on top
  '<path d="M14 10h28l-10 18h-8z"/>' +
    // collar
    '<path d="M22 28h12v3h-12z"/>' +
    // server below
    '<path d="M18 32h20l-2 14c0 2 -2 3 -4 3h-8c -2 0 -4 -1 -4 -3z"/>'
);

const FRENCH_PRESS = svg(
  // beaker body
  '<path d="M18 16h20v26c0 2 -2 3 -4 3h-12c -2 0 -4 -1 -4 -3z"/>' +
    // top lid
    '<path d="M16 14h24"/>' +
    // plunger rod
    '<path d="M28 4v10"/>' +
    '<path d="M25 6h6"/>' +
    // filter disc inside
    '<path d="M19 22h18"/>'
);

const AEROPRESS = svg(
  // chamber
  '<path d="M19 14h18v22h-18z"/>' +
    // filter cap
    '<path d="M19 36h18l-2 4h-14z"/>' +
    // plunger rod
    '<path d="M28 4v10"/>' +
    '<path d="M22 14h12"/>' +
    // graduated marks
    '<path d="M22 22h2"/>' +
    '<path d="M22 28h2"/>'
);

const MOKA_POT = svg(
  // bottom chamber (octagonal-ish)
  '<path d="M18 28l3 -4h14l3 4v12c0 2 -2 3 -4 3h-12c -2 0 -4 -1 -4 -3z"/>' +
    // top chamber
    '<path d="M22 24v-8h12v8"/>' +
    // lid knob
    '<path d="M26 16v-2h4v2"/>' +
    // handle
    '<path d="M40 32h6c2 0 2 6 0 6h-6"/>' +
    // spout
    '<path d="M22 22l-3 -2"/>'
);

// ── Specialty — unique silhouettes ──────────────────────────────────────
const AFFOGATO = svg(
  // cup
  '<path d="M19 24h18v8c0 5 -3 8 -9 8s-9 -3 -9 -8z"/>' +
    '<path d="M37 27c3.5 0 3.5 5.5 0 5.5"/>' +
    // ice cream scoop dome on top
    '<path d="M20 24c2 -8 14 -8 16 0"/>' +
    // espresso pour from above
    '<path d="M28 6v12"/>'
);

const ESPRESSO_TONIC = svg(
  // tall glass
  '<path d="M16 12h24l-2 36c0 2 -2 3 -4 3h-12c -2 0 -4 -1 -4 -3z"/>' +
    // bubbles
    '<circle cx="22" cy="22" r="1"/>' +
    '<circle cx="28" cy="28" r="1"/>' +
    '<circle cx="33" cy="20" r="1"/>' +
    '<circle cx="25" cy="34" r="1"/>' +
    '<circle cx="32" cy="36" r="1"/>' +
    // citrus twist on rim
    '<path d="M14 10c4 0 6 -3 4 -6"/>'
);

const IRISH_COFFEE = svg(
  // stemmed glass — bowl
  '<path d="M16 14h24l-2 14c0 6 -4 9 -10 9s-10 -3 -10 -9z"/>' +
    // cream layer at the top of the bowl
    '<path d="M17 18h22"/>' +
    // stem
    '<path d="M28 37v8"/>' +
    // foot
    '<path d="M22 47h12"/>'
);

const VIETNAMESE = svg(
  // glass
  '<path d="M16 26h24l-2 22c0 2 -2 3 -4 3h-12c -2 0 -4 -1 -4 -3z"/>' +
    // phin filter sitting on top
    '<path d="M20 14h16v12h-16z"/>' +
    // press cap
    '<path d="M24 10h8v4"/>' +
    // dripping coffee
    '<path d="M28 26v3"/>' +
    '<path d="M28 32v2"/>'
);

const TURKISH = svg(
  // cezve (ibrik) — narrow neck, wider belly, long handle
  '<path d="M20 18h14v4l-2 14c0 3 -3 4 -5 4s-5 -1 -5 -4l-2 -14z"/>' +
    // pour spout
    '<path d="M34 18l4 -2"/>' +
    // long handle stretching out
    '<path d="M14 24h-6"/>' +
    '<path d="M14 22l-4 0v4l4 0z"/>'
);

const CUBAN = svg(
  `${STEAM_3}` +
    '<path d="M19 22h18v8c0 5 -3 8 -9 8s-9 -3 -9 -8z"/>' +
    '<path d="M37 25c3.5 0 3.5 5.5 0 5.5"/>' +
    '<ellipse cx="28" cy="44" rx="15" ry="2"/>' +
    // espuma (whipped sugar foam) crown
    '<path d="M19 17q4 -4 8 0t8 0"/>'
);

const COFFEE_ICONS: Record<string, string> = {
  Espresso: ESPRESSO,
  Doppio: ESPRESSO,
  Ristretto: RISTRETTO,
  Lungo: LUNGO,
  'Espresso Macchiato': ESPRESSO_MACCHIATO,
  Americano: AMERICANO,
  'Long Black': LONG_BLACK,
  Cappuccino: CAPPUCCINO,
  Latte: LATTE,
  'Flat White': FLAT_WHITE,
  'Latte Macchiato': LATTE_MACCHIATO,
  Mocha: MOCHA,
  'White Mocha': WHITE_MOCHA,
  Cortado: CORTADO,
  Gibraltar: GIBRALTAR,
  'Cold Brew': COLD_BREW,
  'Iced Americano': ICED_AMERICANO,
  'Iced Latte': ICED_LATTE,
  'Pour Over (V60)': POUR_OVER,
  'French Press': FRENCH_PRESS,
  AeroPress: AEROPRESS,
  'Moka Pot': MOKA_POT,
  Affogato: AFFOGATO,
  'Espresso Tonic': ESPRESSO_TONIC,
  'Irish Coffee': IRISH_COFFEE,
  'Vietnamese Coffee (Cà Phê Sữa Đá)': VIETNAMESE,
  'Turkish Coffee': TURKISH,
  'Cuban Coffee (Cafecito)': CUBAN,
};

/** Returns the SVG string for a drink, or the Espresso default if unknown. */
export function getCoffeeIcon(drinkName: string): string {
  return COFFEE_ICONS[drinkName] ?? ESPRESSO;
}

/** Exposed for tests. */
export const __INTERNAL = { COFFEE_ICONS };
