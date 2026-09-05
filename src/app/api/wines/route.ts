import { NextResponse } from "next/server";
import { asServingNote } from "@/lib/serving-note";
import { keepFacts, saveServing } from "@/lib/wine-facts";
import { ValidationError, createWine, listWines, normalizeInput } from "@/lib/wines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ wines: await listWines() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  let wine;
  try {
    wine = await createWine(normalizeInput(body));
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("wines: create failed:", error);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }

  /*
   * Anything the add screen already looked up, filed against the bottle it now
   * has an id for. Deliberately after the wine is created and deliberately
   * unable to fail the request: the tasting note is the thing being saved, and
   * losing it because a cached web search wouldn't store would be absurd. A
   * bottle that arrives without its facts simply looks itself up on first view,
   * which is what every bottle used to do.
   */
  const extras = body as { facts?: unknown; serving?: unknown };
  await keep(wine.id, extras.facts, extras.serving);

  return NextResponse.json({ wine }, { status: 201 });
}

/**
 * The shape saveFacts expects, checked rather than assumed.
 *
 * These come back over the wire from the add screen, so they've been out of
 * the process and returned. A half-built record would either throw on the way
 * into the database — survivable, it's caught — or store as nonsense, which is
 * not: a bottle would then be carrying a record it never looked anything up
 * for, and nothing would ever ask again because the record exists.
 */
function looksLikeFacts(value: unknown): value is Parameters<typeof keepFacts>[1] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const facts = value as Record<string, unknown>;
  return (
    typeof facts.found === "boolean" &&
    Array.isArray(facts.grapes) &&
    Array.isArray(facts.ratings) &&
    Array.isArray(facts.details) &&
    Array.isArray(facts.awards) &&
    Array.isArray(facts.food) &&
    Array.isArray(facts.sources)
  );
}

async function keep(wineId: string, facts: unknown, serving: unknown): Promise<void> {
  if (looksLikeFacts(facts)) {
    try {
      await keepFacts(wineId, facts);
    } catch (error) {
      console.error("wines: could not keep the facts found while adding:", error);
    }
  } else if (facts) {
    console.error("wines: ignoring a malformed set of facts sent with a new wine");
  }

  const note = asServingNote(serving);
  if (note) {
    try {
      await saveServing(wineId, note);
    } catch (error) {
      console.error("wines: could not keep the serving note found while adding:", error);
    }
  }
}
