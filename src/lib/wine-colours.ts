/**
 * One colour per wine type, and a small glyph for a plate of food.
 *
 * The palette is deliberately narrow: these hues sit in the same warm, low
 * chroma family as the paper and the bordeaux accent, so a page picks up
 * colour without turning into a chart. The rating accent stays bordeaux and is
 * not used here — that one means "you liked it", and nothing else may borrow it.
 */

export const WINE_COLOURS: Record<string, string> = {
  Red: "oklch(43% 0.135 18)",
  White: "oklch(72% 0.105 96)",
  "Rosé": "oklch(70% 0.105 12)",
  Sparkling: "oklch(75% 0.095 85)",
  Orange: "oklch(66% 0.115 55)",
  Dessert: "oklch(62% 0.095 70)",
  Fortified: "oklch(42% 0.085 35)",
};

export function wineColour(type: string | null): string | null {
  return type ? (WINE_COLOURS[type] ?? null) : null;
}

/**
 * A glyph for a food pairing, when one is obvious. Most of these come back as
 * one or two plain words, and a wrong picture is worse than none — anything
 * unmatched simply stays text.
 */
const FOOD_GLYPHS: [RegExp, string][] = [
  [/steak|beef|burger|barbecue|bbq|grill/i, "🥩"],
  [/lamb|venison|game|duck|roast/i, "🍖"],
  [/pork|ham|charcuterie|sausage|bacon/i, "🥓"],
  [/chicken|turkey|poultry/i, "🍗"],
  [/fish|salmon|tuna|cod|seafood/i, "🐟"],
  [/shellfish|oyster|prawn|shrimp|crab|lobster|mussel/i, "🦪"],
  [/cheese/i, "🧀"],
  [/pasta|risotto|pizza|tomato/i, "🍝"],
  [/salad|vegetable|greens|asparagus/i, "🥗"],
  [/mushroom|truffle/i, "🍄"],
  [/spice|curry|chilli|chili|thai|indian/i, "🌶️"],
  [/chocolate|dessert|pudding|cake/i, "🍫"],
  [/bread|tapas|olives|nuts|snack/i, "🫒"],
];

export function foodGlyph(food: string): string | null {
  return FOOD_GLYPHS.find(([pattern]) => pattern.test(food))?.[1] ?? null;
}

/** Gold, silver, bronze — or a generic medal when the award doesn't say. */
export function awardGlyph(award: string): string {
  if (/gold|trophy|best in|winner|platinum/i.test(award)) return "🥇";
  if (/silver/i.test(award)) return "🥈";
  if (/bronze/i.test(award)) return "🥉";
  return "🏅";
}
