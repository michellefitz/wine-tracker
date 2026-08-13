import { sql } from "@/lib/db";
import { PROFILE_VERSION, generateGrapeProfile } from "@/lib/grape-profile";
import { flatten } from "@/lib/text";
import type { GrapeLookup, GrapeProfile, GrapeRegion, Wine } from "@/lib/types";

/**
 * Grape names are typed by hand into a free-text field, so the log contains
 * "Cabernet Sauvignon", "cab sauv" and "CABERNET-SAUVIGNON". Everything here
 * keys off a flattened form of the name — accents stripped, punctuation gone —
 * so those three land on the same page.
 */
export function normalizeGrapeKey(raw: string): string {
  return flatten(raw);
}

/** The key as it appears in a URL. Reversible: hyphens back to spaces. */
export function grapeSlug(raw: string): string {
  return normalizeGrapeKey(raw).replace(/ /g, "-");
}

export function slugToKey(slug: string): string {
  return normalizeGrapeKey(slug);
}

/** Best guess at a display name before the real one is known. */
export function prettifyKey(key: string): string {
  return key
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function toProfile(row: Record<string, unknown>): GrapeProfile {
  return {
    slug: String(row.slug),
    name: String(row.name),
    also_known_as: (row.also_known_as as string[]) ?? [],
    colour: (row.colour as GrapeProfile["colour"]) ?? null,
    summary: String(row.summary),
    acidity: row.acidity === null ? null : Number(row.acidity),
    body: row.body === null ? null : Number(row.body),
    tannin: row.tannin === null ? null : Number(row.tannin),
    sweetness: row.sweetness === null ? null : Number(row.sweetness),
    flavours: (row.flavours as string[]) ?? [],
    regions: (row.regions as GrapeRegion[]) ?? [],
    pairings: (row.pairings as string[]) ?? [],
    // The column is `similar_grapes`; `similar` is reserved in Postgres.
    similar: (row.similar_grapes as string[]) ?? [],
    facts: (row.facts as string[]) ?? [],
  };
}

/** Qualified, because the alias lookup joins two tables that both have `slug`. */
const SELECT_COLUMNS = `
  grapes.slug, grapes.name, grapes.also_known_as, grapes.colour, grapes.summary,
  grapes.acidity, grapes.body, grapes.tannin, grapes.sweetness,
  grapes.flavours, grapes.regions, grapes.pairings, grapes.similar_grapes,
  grapes.facts, grapes.version
`;

/**
 * What we've already got for this key, if anything.
 *
 * A row in `grape_aliases` with a null slug means we asked once and it isn't a
 * grape — cached so a stray "blend" in the grapes field costs one call ever.
 */
async function findCached(
  key: string,
): Promise<{ kind: "profile"; profile: GrapeProfile; stale: boolean } | { kind: "unknown" } | null> {
  const db = sql();
  const rows = (await db.query(
    `SELECT ${SELECT_COLUMNS}
       FROM grape_aliases
       LEFT JOIN grapes ON grapes.slug = grape_aliases.slug
      WHERE grape_aliases.alias = $1`,
    [key],
  )) as Record<string, unknown>[];

  const row = rows[0];
  if (!row) return null;
  if (row.slug === null) return { kind: "unknown" };
  return {
    kind: "profile",
    profile: toProfile(row),
    stale: Number(row.version ?? 0) < PROFILE_VERSION,
  };
}

/** Points every spelling we know of at the stored profile. */
async function saveProfile(profile: Omit<GrapeProfile, "slug">, askedFor: string): Promise<string> {
  const db = sql();
  const slug = grapeSlug(profile.name);

  await db.query(
    `INSERT INTO grapes
       (slug, name, also_known_as, colour, summary, acidity, body, tannin, sweetness,
        flavours, regions, pairings, similar_grapes, facts, version)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9,
             $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       also_known_as = EXCLUDED.also_known_as,
       colour = EXCLUDED.colour,
       summary = EXCLUDED.summary,
       acidity = EXCLUDED.acidity,
       body = EXCLUDED.body,
       tannin = EXCLUDED.tannin,
       sweetness = EXCLUDED.sweetness,
       flavours = EXCLUDED.flavours,
       regions = EXCLUDED.regions,
       pairings = EXCLUDED.pairings,
       similar_grapes = EXCLUDED.similar_grapes,
       facts = EXCLUDED.facts,
       version = EXCLUDED.version`,
    [
      slug,
      profile.name,
      JSON.stringify(profile.also_known_as),
      profile.colour,
      profile.summary,
      profile.acidity,
      profile.body,
      profile.tannin,
      profile.sweetness,
      JSON.stringify(profile.flavours),
      JSON.stringify(profile.regions),
      JSON.stringify(profile.pairings),
      JSON.stringify(profile.similar),
      JSON.stringify(profile.facts),
      PROFILE_VERSION,
    ],
  );

  const aliases = new Set(
    [askedFor, normalizeGrapeKey(profile.name), ...profile.also_known_as.map(normalizeGrapeKey)]
      .filter(Boolean),
  );
  for (const alias of aliases) {
    await db.query(
      `INSERT INTO grape_aliases (alias, slug) VALUES ($1, $2)
       ON CONFLICT (alias) DO UPDATE SET slug = EXCLUDED.slug`,
      [alias, slug],
    );
  }

  return slug;
}

async function rememberUnknown(key: string): Promise<void> {
  const db = sql();
  await db.query(
    `INSERT INTO grape_aliases (alias, slug) VALUES ($1, NULL)
     ON CONFLICT (alias) DO NOTHING`,
    [key],
  );
}

/** Postgres for "no such table" — the schema hasn't been brought up to date. */
const UNDEFINED_TABLE = "42P01";

/**
 * Why the cache didn't work, in words that say what to do about it.
 *
 * Missing tables are the one failure worth naming precisely: it's what happens
 * on the deploy right after this feature lands, and "couldn't reach the
 * database" would send you hunting for a connection problem you don't have.
 */
function cacheTrouble(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error);

  if (code === UNDEFINED_TABLE || /relation .*grape.* does not exist/i.test(message)) {
    return "These notes aren't being saved yet: the grape tables aren't in the database. Run `npm run db:init` — it's safe to re-run — and they'll be written once and kept.";
  }
  return "These notes couldn't be saved just now, so they'll be written again next time you look.";
}

/**
 * The one entry point: give it whatever the grape was called on the bottle and
 * get back a profile, cached after the first time.
 *
 * Nothing here throws. An API problem comes back as `unavailable` and a
 * database problem as a `warning` alongside the notes, on the same principle as
 * the label reader — you can always read the rest of the page.
 */
export async function getGrapeProfile(rawName: string): Promise<GrapeLookup> {
  const key = normalizeGrapeKey(rawName);
  if (!key) return { status: "unknown", note: null };

  // A broken cache is a slow feature, not a broken one: fall through and write
  // the profile fresh. The only thing lost is that it can't be kept.
  let cached: Awaited<ReturnType<typeof findCached>> = null;
  let warning: string | null = null;
  try {
    cached = await findCached(key);
  } catch (error) {
    console.error("grapes: cache lookup failed:", error);
    warning = cacheTrouble(error);
  }

  if (cached?.kind === "unknown") return { status: "unknown", note: null };
  if (cached?.kind === "profile" && !cached.stale) {
    return { status: "ok", profile: cached.profile, warning: null };
  }

  const generated = await generateGrapeProfile(prettifyKey(key));

  if (generated.status === "unavailable") {
    // A stale profile beats an error message.
    if (cached?.kind === "profile") return { status: "ok", profile: cached.profile, warning: null };
    return generated;
  }

  if (generated.status === "unknown") {
    try {
      await rememberUnknown(key);
    } catch (error) {
      console.error("grapes: could not cache an unknown grape:", error);
    }
    return generated;
  }

  try {
    const slug = await saveProfile(generated.profile, key);
    return { status: "ok", profile: { ...generated.profile, slug }, warning };
  } catch (error) {
    console.error("grapes: could not cache the profile:", error);
    return {
      status: "ok",
      profile: { ...generated.profile, slug: grapeSlug(generated.profile.name) },
      warning: warning ?? cacheTrouble(error),
    };
  }
}

/** Every name this grape answers to, flattened — used to match your bottles. */
export function profileKeys(profile: GrapeProfile, asked: string): string[] {
  return Array.from(
    new Set(
      [asked, normalizeGrapeKey(profile.name), ...profile.also_known_as.map(normalizeGrapeKey)]
        .filter(Boolean),
    ),
  );
}

export function winesWithGrape(wines: Wine[], keys: string[]): Wine[] {
  const wanted = new Set(keys);
  return wines.filter((wine) => wine.grapes.some((grape) => wanted.has(normalizeGrapeKey(grape))));
}

/** The headings the grape index is grouped under, in the order they appear. */
export const GRAPE_STYLES = ["Red", "White", "Sparkling", "Dessert"] as const;

export type GrapeStyle = (typeof GRAPE_STYLES)[number];

/**
 * The seven types you can log, folded into those four. Rosé is made from red
 * grapes and orange from white ones, so each sits with its grape's colour;
 * fortified sits with dessert, being the other sweet thing on the shelf.
 */
const STYLE_BY_TYPE: Record<string, GrapeStyle> = {
  red: "Red",
  rose: "Red",
  white: "White",
  orange: "White",
  sparkling: "Sparkling",
  dessert: "Dessert",
  fortified: "Dessert",
};

export function styleOf(wineType: string | null): GrapeStyle | null {
  if (!wineType) return null;
  const key = wineType
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return STYLE_BY_TYPE[key] ?? null;
}

export type GrapeTally = {
  key: string;
  slug: string;
  /** The spelling used most often in the log, so it reads back as you wrote it. */
  label: string;
  /** Every spelling behind this row, commonest first. */
  spellings: string[];
  count: number;
  liked: number;
  disliked: number;
  /** How many bottles of each style this grape turned up in. */
  styles: Partial<Record<GrapeStyle, number>>;
};

/**
 * Which heading a grape belongs under: whichever style you've actually drunk it
 * as most often. A grape only ever logged in bottles with no type set has no
 * style, and falls to the end of the page.
 */
export function grapeStyle(tally: GrapeTally): GrapeStyle | null {
  let best: GrapeStyle | null = null;
  for (const style of GRAPE_STYLES) {
    const count = tally.styles[style] ?? 0;
    if (count > 0 && (best === null || count > (tally.styles[best] ?? 0))) best = style;
  }
  return best;
}

/** The tallies split under their headings, empty groups dropped. */
export function groupByStyle(
  tallies: GrapeTally[],
): { style: GrapeStyle | null; grapes: GrapeTally[] }[] {
  const groups = new Map<GrapeStyle | null, GrapeTally[]>();
  for (const tally of tallies) {
    const style = grapeStyle(tally);
    const group = groups.get(style);
    if (group) group.push(tally);
    else groups.set(style, [tally]);
  }

  const ordered: { style: GrapeStyle | null; grapes: GrapeTally[] }[] = [];
  for (const style of GRAPE_STYLES) {
    const grapes = groups.get(style);
    if (grapes) ordered.push({ style, grapes });
  }
  const untyped = groups.get(null);
  if (untyped) ordered.push({ style: null, grapes: untyped });
  return ordered;
}

function bySize(a: GrapeTally, b: GrapeTally): number {
  return b.count - a.count || a.label.localeCompare(b.label);
}

/**
 * The grapes in your own log, most-drunk first. This is the honest starting
 * point for learning: the varieties you actually keep buying.
 */
export function tallyGrapes(wines: Wine[]): GrapeTally[] {
  const tallies = new Map<string, Omit<GrapeTally, "spellings"> & { spellings: Map<string, number> }>();

  for (const wine of wines) {
    const style = styleOf(wine.wine_type);

    for (const grape of wine.grapes) {
      const key = normalizeGrapeKey(grape);
      if (!key) continue;

      let tally = tallies.get(key);
      if (!tally) {
        tally = {
          key,
          slug: grapeSlug(grape),
          label: grape,
          count: 0,
          liked: 0,
          disliked: 0,
          styles: {},
          spellings: new Map(),
        };
        tallies.set(key, tally);
      }

      tally.count += 1;
      if (wine.score > 0) tally.liked += 1;
      if (wine.score < 0) tally.disliked += 1;
      if (style) tally.styles[style] = (tally.styles[style] ?? 0) + 1;
      tally.spellings.set(grape, (tally.spellings.get(grape) ?? 0) + 1);
    }
  }

  return Array.from(tallies.values())
    .map(({ spellings, ...tally }) => {
      const ranked = Array.from(spellings.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([spelling]) => spelling);
      return { ...tally, label: ranked[0], spellings: ranked };
    })
    .sort(bySize);
}

/**
 * Folds rows that are the same grape under two names — Shiraz and Syrah, Malbec
 * and Côt — into one, using the synonyms learned when their profiles were
 * written. Nothing is folded until you've opened the grape at least once, which
 * is the right order: the app shouldn't claim two names are one grape before it
 * has looked that up.
 */
export async function mergeKnownSynonyms(tallies: GrapeTally[]): Promise<GrapeTally[]> {
  if (tallies.length === 0) return tallies;

  const db = sql();
  const rows = (await db.query(
    `SELECT grape_aliases.alias, grapes.slug, grapes.name
       FROM grape_aliases
       JOIN grapes ON grapes.slug = grape_aliases.slug
      WHERE grape_aliases.alias = ANY($1::text[])`,
    [tallies.map((tally) => tally.key)],
  )) as { alias: string; slug: string; name: string }[];

  if (rows.length === 0) return tallies;
  const known = new Map(rows.map((row) => [row.alias, row]));

  const merged = new Map<string, GrapeTally>();
  for (const tally of tallies) {
    const match = known.get(tally.key);
    const id = match ? match.slug : tally.key;
    const existing = merged.get(id);

    if (!existing) {
      merged.set(id, match
        ? { ...tally, key: slugToKey(match.slug), slug: match.slug, label: match.name, styles: { ...tally.styles } }
        : { ...tally, styles: { ...tally.styles } });
      continue;
    }

    existing.count += tally.count;
    existing.liked += tally.liked;
    existing.disliked += tally.disliked;
    existing.spellings = [...existing.spellings, ...tally.spellings];
    for (const style of GRAPE_STYLES) {
      const count = tally.styles[style];
      if (count) existing.styles[style] = (existing.styles[style] ?? 0) + count;
    }
  }

  return Array.from(merged.values()).sort(bySize);
}

/** The spellings on a row that aren't just the grape's own name. */
export function otherSpellings(tally: GrapeTally): string[] {
  const canonical = normalizeGrapeKey(tally.label);
  return Array.from(
    new Set(tally.spellings.filter((spelling) => normalizeGrapeKey(spelling) !== canonical)),
  );
}
