import { sql } from "@/lib/db";
import { PROFILE_VERSION, generateGrapeProfile } from "@/lib/grape-profile";
import type { GrapeLookup, GrapeProfile, GrapeRegion, Wine } from "@/lib/types";

/**
 * Grape names are typed by hand into a free-text field, so the log contains
 * "Cabernet Sauvignon", "cab sauv" and "CABERNET-SAUVIGNON". Everything here
 * keys off a flattened form of the name — accents stripped, punctuation gone —
 * so those three land on the same page.
 */
export function normalizeGrapeKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

/**
 * The one entry point: give it whatever the grape was called on the bottle and
 * get back a profile, cached after the first time.
 *
 * Nothing here throws. A database or API problem comes back as `unavailable`,
 * on the same principle as the label reader — you can always read the rest of
 * the page.
 */
export async function getGrapeProfile(rawName: string): Promise<GrapeLookup> {
  const key = normalizeGrapeKey(rawName);
  if (!key) return { status: "unknown", note: null };

  let cached: Awaited<ReturnType<typeof findCached>> = null;
  try {
    cached = await findCached(key);
  } catch (error) {
    console.error("grapes: cache lookup failed:", error);
    return { status: "unavailable", message: "Couldn't reach the database." };
  }

  if (cached?.kind === "unknown") return { status: "unknown", note: null };
  if (cached?.kind === "profile" && !cached.stale) {
    return { status: "ok", profile: cached.profile };
  }

  const generated = await generateGrapeProfile(prettifyKey(key));

  if (generated.status === "unavailable") {
    // A stale profile beats an error message.
    if (cached?.kind === "profile") return { status: "ok", profile: cached.profile };
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
    return { status: "ok", profile: { ...generated.profile, slug } };
  } catch (error) {
    console.error("grapes: could not cache the profile:", error);
    // Worth showing even if it couldn't be saved; it'll be regenerated next time.
    return { status: "ok", profile: { ...generated.profile, slug: grapeSlug(generated.profile.name) } };
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

export type GrapeTally = {
  key: string;
  slug: string;
  /** The spelling used most often in the log, so it reads back as you wrote it. */
  label: string;
  count: number;
  liked: number;
  disliked: number;
};

/**
 * The grapes in your own log, most-drunk first. This is the honest starting
 * point for learning: the varieties you actually keep buying.
 */
export function tallyGrapes(wines: Wine[]): GrapeTally[] {
  const tallies = new Map<string, GrapeTally & { spellings: Map<string, number> }>();

  for (const wine of wines) {
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
          spellings: new Map(),
        };
        tallies.set(key, tally);
      }

      tally.count += 1;
      if (wine.score > 0) tally.liked += 1;
      if (wine.score < 0) tally.disliked += 1;
      tally.spellings.set(grape, (tally.spellings.get(grape) ?? 0) + 1);
    }
  }

  return Array.from(tallies.values())
    .map(({ spellings, ...tally }) => {
      const [label] = Array.from(spellings.entries()).sort((a, b) => b[1] - a[1])[0];
      return { ...tally, label };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
