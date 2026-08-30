import { EU_WINE_REGIONS, type RegionRow } from "@/lib/eu-wine-regions";
import { flatten } from "@/lib/text";

/**
 * Matching what a label says against the European appellation register.
 *
 * This is the rung of the placement ladder that beats asking a model where a
 * region is, because it is a lookup rather than a recollection: 1,177 EU
 * appellations with real centres, from the Eurac Research PDO inventory. When
 * a bottle says "Barolo" this returns Barolo's actual centre, and no
 * hallucinated coordinate or geocoder confusing it with a town in Hubei gets a
 * say.
 *
 * It only covers the EU. Everything outside — Argentina, Australia, California,
 * South Africa, Georgia — falls through to what the lookup claimed, and then to
 * the country's wine centre, which is why the ladder still has those rungs.
 *
 * Matching is deliberately conservative. A region field can hold anything from
 * "Barolo" to "Rioja Alta, Haro" to "Piedmont", and a wrong hit is worse than a
 * miss, so this only accepts an exact name or a comma-separated part of one
 * (which is how "Rioja Alta, Haro" finds nothing and "Barolo DOCG" finds
 * Barolo). Fuzzy matching is left out on purpose: "Rioja Alta" is a subzone of
 * Rioja and shares most of its letters with it, but so does "Rioja Baja", forty
 * miles away.
 */

export type Region = {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, as the register gives it. */
  country: string;
  longitude: number;
  latitude: number;
};

const [KEY, NAME, COUNTRY, LON, LAT] = [0, 1, 2, 3, 4] as const;

let index: Map<string, RegionRow[]> | null = null;

/** Built once, on first use — 1,177 rows is not worth doing at import time. */
function byKey(): Map<string, RegionRow[]> {
  if (index) return index;
  index = new Map();
  for (const row of EU_WINE_REGIONS) {
    const existing = index.get(row[KEY]);
    if (existing) existing.push(row);
    else index.set(row[KEY], [row]);
  }
  return index;
}

function toRegion(row: RegionRow): Region {
  return {
    id: row[NAME],
    name: row[NAME],
    country: row[COUNTRY],
    longitude: row[LON],
    latitude: row[LAT],
  };
}

/**
 * The appellation this text names, if it names one unambiguously.
 *
 * `iso` narrows the search to one country when we know it, which is what makes
 * the shared names safe: there is a Bordeaux-adjacent "Graves" and a Portuguese
 * town of the same sound, and several names repeat across borders.
 */
export function findRegion(text: string | null | undefined, iso?: string | null): Region | null {
  if (!text) return null;

  const wanted = iso?.toUpperCase();
  const pick = (rows: RegionRow[] | undefined): Region | null => {
    if (!rows || rows.length === 0) return null;
    const inCountry = wanted ? rows.filter((row) => row[COUNTRY] === wanted) : rows;
    // One clear answer, or none: never guess between two countries' homonyms.
    if (inCountry.length === 1) return toRegion(inCountry[0]);
    if (!wanted && rows.length === 1) return toRegion(rows[0]);
    return null;
  };

  const table = byKey();

  const whole = flatten(text);
  const direct = pick(table.get(whole));
  if (direct) return direct;

  /*
   * "Rioja Alta, Haro" and "Barolo DOCG" are the two shapes a region field
   * actually arrives in: a narrowing list, and a name with its classification
   * stapled on. Both are handled by trying each comma-separated part, longest
   * first so the most specific one wins.
   */
  const parts = text
    .split(",")
    .map((part) => flatten(part))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const part of parts) {
    const hit = pick(table.get(part));
    if (hit) return hit;
    // "Barolo DOCG" -> "barolo": drop a trailing classification word.
    const trimmed = part.replace(/\s+(docg?|doca|dop|pdo|igp|igt|aoc|aop|ava|do)$/u, "");
    if (trimmed !== part) {
      const stripped = pick(table.get(trimmed));
      if (stripped) return stripped;
    }
  }

  return null;
}

/** How many appellations the register holds, for the about screen. */
export const REGION_COUNT = EU_WINE_REGIONS.length;
