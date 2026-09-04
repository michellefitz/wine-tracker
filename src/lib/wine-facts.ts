import { sql } from "@/lib/db";
import { asServingNote, type ServingNote } from "@/lib/serving-note";
import { FACTS_VERSION, researchWine, worthShowing } from "@/lib/wine-research";
import type { Wine, WineFacts, WineRating } from "@/lib/types";

/**
 * The store for what the web knows about each bottle.
 *
 * Looked up once and kept, like grape profiles — but unlike a grape, a bottle
 * can gain coverage after you drink it, and the lookup itself gets better as
 * the prompt is tuned. So there's a refresh path that ignores what's stored.
 */

const SELECT_COLUMNS = `
  wine_id, found, summary, style, grapes, ratings, details, awards, food, sources, place,
  serving, note, version, looked_up_at
`;

export type StoredFacts = WineFacts & { looked_up_at: string; stale: boolean };

function toFacts(row: Record<string, unknown>): StoredFacts {
  return {
    wine_id: String(row.wine_id),
    found: row.found === true,
    summary: (row.summary as string) ?? null,
    style: (row.style as string) ?? null,
    grapes: (row.grapes as string[]) ?? [],
    ratings: (row.ratings as WineRating[]) ?? [],
    details: (((row.details as { label: string; value: string }[]) ?? []).filter(worthShowing)),
    awards: (row.awards as string[]) ?? [],
    food: (row.food as string[]) ?? [],
    sources: (row.sources as { title: string; url: string }[]) ?? [],
    place: (row.place as WineFacts["place"]) ?? null,
    // Checked rather than cast: a note written under an older shape, or a
    // half-written one, has to fall back to the rules rather than render three
    // lines and a gap.
    serving: asServingNote(row.serving),
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

/**
 * Grapes the lookup found, by wine.
 *
 * A bottle's grapes live in two places: the ones you typed, on the wine itself,
 * and the ones a search turned up, over here. The wine's own page has always
 * shown both, which made it look like every page did — but the grape index and
 * the grape pages counted only what was typed, so a bottle you never filled the
 * grapes in for was invisible to them. A Pet-Nat whose three grapes all came
 * from the web took the whole Sparkling heading down with it.
 */
export async function foundGrapes(): Promise<Map<string, string[]>> {
  const db = sql();
  const rows = (await db.query(
    `SELECT wine_id, grapes FROM wine_facts WHERE jsonb_array_length(grapes) > 0`,
  )) as Record<string, unknown>[];

  return new Map(rows.map((row) => [String(row.wine_id), (row.grapes as string[]) ?? []]));
}

/**
 * Every place the lookup has already found, by wine.
 *
 * A plain read: the map shows what is known, and must never set a hundred
 * lookups running because someone opened it. A bottle with nothing stored still
 * lands — placeFor falls back to its region field and then to its country — it
 * just lands more vaguely, and the map says so.
 */
export async function storedPlaces(): Promise<Map<string, WineFacts["place"]>> {
  const db = sql();
  const rows = (await db.query(
    `SELECT wine_id, place FROM wine_facts WHERE place IS NOT NULL`,
  )) as Record<string, unknown>[];

  return new Map(rows.map((row) => [String(row.wine_id), row.place as WineFacts["place"]]));
}

/**
 * The same wines, with looked-up grapes filled in where you didn't type any.
 *
 * What you wrote always wins. Anything that counts grapes across the whole log
 * should read them through here, so the answer doesn't depend on which page is
 * asking. Costs nothing when every bottle already has its grapes, and degrades
 * to what was typed if the facts table can't be read.
 */
export async function withFoundGrapes(wines: Wine[]): Promise<Wine[]> {
  if (wines.every((wine) => wine.grapes.length > 0)) return wines;

  let found: Map<string, string[]>;
  try {
    found = await foundGrapes();
  } catch (error) {
    console.error("wine-facts: could not read looked-up grapes:", error);
    return wines;
  }

  return wines.map((wine) =>
    wine.grapes.length > 0 ? wine : { ...wine, grapes: found.get(wine.id) ?? [] },
  );
}

async function saveFacts(facts: WineFacts): Promise<void> {
  const db = sql();
  await db.query(
    `INSERT INTO wine_facts
       (wine_id, found, summary, style, grapes, ratings, details, awards, food, sources, place,
        serving, note, version, looked_up_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb,
             $11::jsonb, $12::jsonb, $13, $14, now())
     ON CONFLICT (wine_id) DO UPDATE SET
       found = EXCLUDED.found,
       summary = EXCLUDED.summary,
       style = EXCLUDED.style,
       grapes = EXCLUDED.grapes,
       ratings = EXCLUDED.ratings,
       details = EXCLUDED.details,
       awards = EXCLUDED.awards,
       food = EXCLUDED.food,
       sources = EXCLUDED.sources,
       place = EXCLUDED.place,
       serving = EXCLUDED.serving,
       note = EXCLUDED.note,
       version = EXCLUDED.version,
       looked_up_at = now()`,
    [
      facts.wine_id,
      facts.found,
      facts.summary,
      facts.style,
      JSON.stringify(facts.grapes),
      JSON.stringify(facts.ratings),
      JSON.stringify(facts.details),
      JSON.stringify(facts.awards),
      JSON.stringify(facts.food),
      JSON.stringify(facts.sources),
      JSON.stringify(facts.place),
      JSON.stringify(facts.serving),
      facts.note,
      FACTS_VERSION,
    ],
  );
}

/**
 * Writes just the serving note, leaving everything else alone.
 *
 * The note doesn't need the web — how cold a Barolo wants to be is not a thing
 * anyone looks up — so it shouldn't have to wait behind a search to be written,
 * or be lost for good because one failed. This is the path that fills it in on
 * its own: two seconds and one small model call, against a row that may not
 * exist yet.
 *
 * A placeholder row goes in at version 0 rather than the current one, so a
 * bottle that has a serving note and nothing else still counts as never
 * properly looked up, and the first view that can afford a search does one.
 */
export async function saveServing(wineId: string, note: ServingNote): Promise<void> {
  const db = sql();
  await db.query(
    `INSERT INTO wine_facts (wine_id, found, serving, version, looked_up_at)
     VALUES ($1, false, $2::jsonb, 0, now())
     ON CONFLICT (wine_id) DO UPDATE SET serving = EXCLUDED.serving`,
    [wineId, JSON.stringify(note)],
  );
}

/** Postgres for "no such table" and "no such column" — the schema is behind. */
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";

function storeTrouble(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error);

  if (code === UNDEFINED_TABLE || /relation .*wine_facts.* does not exist/i.test(message)) {
    return "This isn't being saved yet: the wine_facts table isn't in the database. Run `npm run db:init` — it's safe to re-run.";
  }
  if (code === UNDEFINED_COLUMN || /column .* does not exist/i.test(message)) {
    return "This isn't being saved yet: the wine_facts table is missing a column added since you made it. Run `npm run db:init` — it's safe to re-run.";
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
    /*
     * Something already on file beats an error message — but not silently.
     * Swallowing the reason here is how a refresh that never searched at all
     * came back looking like a refresh that found nothing new: the old write-up
     * reappeared, the failure went to the logs, and the page said nothing.
     */
    if (cached) return { status: "ok", facts: cached, warning: researched.message };
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
