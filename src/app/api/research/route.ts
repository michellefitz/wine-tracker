import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { describeBottle, researchWine, type BottleLabel } from "@/lib/wine-research";
import { servingNoteFor } from "@/lib/serving-note";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The same ceiling the wine page's lookup gets; it's the same two calls. */
export const maxDuration = 120;

/**
 * Looks a bottle up before it's a bottle.
 *
 * The wine page has always been able to do this, but only after the wine was
 * saved — so logging one meant waiting through the label reading, saving, and
 * then waiting through a web search all over again on the page that opened.
 * Two waits, one after the other, with a save wedged between them, and the
 * second one quietly rewrote the serving note you had just read.
 *
 * This is the same search, run against the label instead of a record, so it
 * can happen while you're still deciding what you thought of the wine. What it
 * finds is handed back rather than stored — there's nothing to store it
 * against yet — and goes to the server again with the wine when you save.
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY isn't set." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as Partial<BottleLabel> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "A wine name is needed to search for one." }, { status: 400 });
  }

  const label: BottleLabel = {
    producer: typeof body?.producer === "string" ? body.producer.trim() || null : null,
    name,
    vintage: typeof body?.vintage === "number" ? body.vintage : null,
    region: typeof body?.region === "string" ? body.region.trim() || null : null,
    country: typeof body?.country === "string" ? body.country.trim() || null : null,
    grapes: Array.isArray(body?.grapes)
      ? body.grapes.filter((grape): grape is string => typeof grape === "string").slice(0, 6)
      : [],
    wine_type: typeof body?.wine_type === "string" ? body.wine_type.trim() || null : null,
  };

  /*
   * Both at once. The serving note needs nothing from the web, so it finishes
   * long before the search does and costs the wait nothing.
   */
  const [found, note] = await Promise.all([
    researchWine(label),
    servingNoteFor(new Anthropic(), describeBottle(label)),
  ]);

  if (found.status === "unavailable") {
    // The note may still have arrived, and it's worth having on its own.
    return NextResponse.json({ facts: null, serving: note.note, reason: found.message });
  }

  return NextResponse.json({ facts: found.facts, serving: note.note });
}
