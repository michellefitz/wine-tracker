import { sql } from "@/lib/db";
import { FACTS_VERSION, researchWine } from "@/lib/wine-research";
import type { Wine, WineFacts, WineRating } from "@/lib/types";

/**
 * The store for what the web knows about each bottle.
 *
 * Looked up once and kept, like grape profiles — but unlike a grape, a bottle
 * can gain coverage after you drink it, and the lookup itself gets better as
 * the prompt is tuned. So there's a refresh path that ignores what's stored.
 */

const SELECT_COLUMNS = `
  wine_id, found, summary, style, ratings, details, awards, food, sources, note,
  version, looked_up_at
`;

export type StoredFacts = WineFacts & { looked_up_at: string; stale: boolean };

function toFacts(row: Record<string, unknown>): StoredFacts {
  return {
    wine_id: String(row.wine_id),
    found: row.found === true,
    summary: (row.summary as string) ?? null,
    style: (row.style as string) ?? null,
    ratings: (row.ratings as WineRating[]) ?? [],
    details: (row.details as { label: string; value: string }[]) ?? [],
    awards: (row.awards as string[]) ?? [],
    food: (row.food as string[]) ?? [],
    sources: (row.sources as { title: string; url: string }[]) ?? [],
    note: (row.note as string) ?? null,
    looked_up_at: String(row.looked_up_at),
    stale: Number(row.version ?? 0) < FACTS_VERSION,
  };
}

export async function findFacts(wineId: string): Promise<StoredFacts | null> {
  const db = sql();
  const rows = (await db.query(
    `SELECT ${SELECT_COLUMNS} FROM wine_facts WHERE wine_id = $1`,
    [wineId],
  )) as Record<string, unknown>[];
  return rows[0] ? toFacts(rows[0]) : null;
}

async function saveFacts(facts: WineFacts): Promise<void> {
  const db = sql();
  await db.query(
    `INSERT INTO wine_facts
       (wine_id, found, summary, style, ratings, details, awards, food, sources, note,
        version, looked_up_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, now())
     ON CONFLICT (wine_id) DO UPDATE SET
       found = EXCLUDED.found,
       summary = EXCLUDED.summary,
       style = EXCLUDED.style,
       ratings = EXCLUDED.ratings,
       details = EXCLUDED.details,
       awards = EXCLUDED.awards,
       food = EXCLUDED.food,
       sources = EXCLUDED.sources,
       note = EXCLUDED.note,
       version = EXCLUDED.version,
       looked_up_at = now()`,
    [
      facts.wine_id,
      facts.found,
      facts.summary,
      facts.style,
      JSON.stringify(facts.ratings),
      JSON.stringify(facts.details),
      JSON.stringify(facts.awards),
      JSON.stringify(facts.food),
      JSON.stringify(facts.sources),
      facts.note,
      FACTS_VERSION,
    ],
  );
}

/** Postgres for "no such table" — the schema hasn't been brought up to date. */
const UNDEFINED_TABLE = "42P01";

function storeTrouble(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error);

  if (code === UNDEFINED_TABLE || /relation .*wine_facts.* does not exist/i.test(message)) {
    return "This isn't being saved yet: the wine_facts table isn't in the database. Run `npm run db:init` — it's safe to re-run.";
  }
  return "This couldn't be saved, so it'll be looked up again next time.";
}

export type FactsLookup =
  | { status: "ok"; facts: StoredFacts; warning: string | null }
  | { status: "unavailable"; message: string };

/**
 * What's known about this bottle, looking it up if we haven't yet.
 *
 * `refresh` skips whatever is stored and searches again — the button on the
 * wine page, and the way an old entry picks up an improved lookup.
 *
 * Nothing here throws: a broken store costs the caching, not the feature.
 */
export async function getWineFacts(wine: Wine, refresh = false): Promise<FactsLookup> {
  let cached: StoredFacts | null = null;
  let warning: string | null = null;

  try {
    cached = await findFacts(wine.id);
  } catch (error) {
    console.error("wine-facts: lookup failed:", error);
    warning = storeTrouble(error);
  }

  if (!refresh && cached && !cached.stale) {
    return { status: "ok", facts: cached, warning: null };
  }

  const researched = await researchWine(wine);

  if (researched.status === "unavailable") {
    // Something already on file beats an error message.
    if (cached) return { status: "ok", facts: cached, warning: null };
    return researched;
  }

  const facts: WineFacts = { ...researched.facts, wine_id: wine.id };
  try {
    await saveFacts(facts);
  } catch (error) {
    console.error("wine-facts: could not save:", error);
    warning = warning ?? storeTrouble(error);
  }

  return {
    status: "ok",
    facts: { ...facts, looked_up_at: new Date().toISOString(), stale: false },
    warning,
  };
}
