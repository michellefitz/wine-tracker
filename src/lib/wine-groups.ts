import type { Wine } from "@/lib/types";

/**
 * The handful of kinds of wine a list is written in.
 *
 * Narrower than WINE_TYPES on purpose. The log can record orange, dessert and
 * fortified, and should — but a shelf with a heading over a single bottle is a
 * heading that costs more than it tells you, so everything past the four
 * everyday kinds shares one.
 *
 * This lives here rather than in either of the two views that need it because
 * they have to agree. The shelf and the shop both put reds first and both have
 * to call the same bottle a rosé; two copies of this would drift the first time
 * one of them was edited, and the symptom would be a wine that moves shelf
 * depending on which screen you are looking at.
 */
export type SimpleType = "Red" | "White" | "Rosé" | "Sparkling" | "Other";

/* The order a wine list is written in, which is also WINE_TYPES' own. */
export const GROUP_ORDER: SimpleType[] = ["Red", "White", "Rosé", "Sparkling", "Other"];

/**
 * The shelf a bottle belongs on.
 *
 * Rosé has a shelf of its own. It is one of the types the app offers and one
 * of the three or four kinds of wine anybody actually buys, and it was falling
 * through to "Other" — filed with orange, dessert and fortified, under a
 * heading that says the app has no word for what you are holding.
 *
 * The accent is folded before matching, because the acute is the first thing
 * lost between a label, a phone keyboard and a model: "Rosé", "Rose" and
 * "rosé" are one wine and have to land on one shelf. Anything genuinely
 * outside the list still goes to Other, which is what Other is for.
 */
export function simplifyType(wineType: string | null): SimpleType {
  if (!wineType) return "Other";
  const plain = wineType.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  if (plain === "red") return "Red";
  if (plain === "white") return "White";
  if (plain === "rose") return "Rosé";
  if (plain === "sparkling") return "Sparkling";
  return "Other";
}

/** The wines under each heading, in GROUP_ORDER, with the empty ones dropped. */
export function groupWines(wines: Wine[]): Map<SimpleType, Wine[]> {
  const groups = new Map<SimpleType, Wine[]>();
  for (const type of GROUP_ORDER) groups.set(type, []);
  for (const wine of wines) {
    const type = simplifyType(wine.wine_type);
    groups.get(type)!.push(wine);
  }
  for (const [type, list] of groups) {
    if (list.length === 0) groups.delete(type);
  }
  return groups;
}
