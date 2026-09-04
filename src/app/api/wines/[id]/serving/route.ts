import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { describeBottle } from "@/lib/wine-research";
import { saveServing } from "@/lib/wine-facts";
import { servingNoteFor } from "@/lib/serving-note";
import { getWine } from "@/lib/wines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One short model call and a write. Nothing here searches the web, so this
 * finishes in a couple of seconds and never needs the lookup's 120.
 */
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Writes the serving note for one bottle, on its own.
 *
 * It used to be written only as part of a full lookup, which tied a two-second
 * job that needs nothing to a thirty-five-second one that needs the web — so a
 * bottle whose note failed, or whose facts were filed before notes existed,
 * had no way back to one short of searching for the whole bottle again. This
 * is that way back, and it's what the page calls when it finds a bottle
 * without one.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { serving: null, reason: "ANTHROPIC_API_KEY isn't set, so notes can't be written." },
      { status: 503 },
    );
  }

  const wine = await getWine(id);
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await servingNoteFor(new Anthropic(), describeBottle(wine));
  if (!result.note) {
    return NextResponse.json({ serving: null, reason: result.reason }, { status: 502 });
  }

  try {
    await saveServing(id, result.note);
  } catch (error) {
    // The note is good; only the keeping of it failed. Hand it over anyway —
    // the page can show it now and ask again next time.
    console.error("serving: could not store the note:", error);
    return NextResponse.json({ serving: result.note, stored: false });
  }

  return NextResponse.json({ serving: result.note, stored: true });
}
