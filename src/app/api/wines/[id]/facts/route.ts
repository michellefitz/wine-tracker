import { NextResponse } from "next/server";
import { findFacts, getWineFacts } from "@/lib/wine-facts";
import { getWine } from "@/lib/wines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Searching the web and filing the result runs well past the default budget.
 * 120s is comfortably inside this plan's ceiling and leaves 40s of headroom
 * over what the two model calls can spend between them.
 */
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * What's on file, without searching for anything.
 *
 * A lookup outlives the screen that started it: the request keeps running on
 * the server whether or not anyone is still watching, and the result is written
 * down when it lands. This is how a page that comes back later collects it —
 * one row, no API call — instead of starting the same search a second time.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    return NextResponse.json({ facts: await findFacts(id) });
  } catch (error) {
    console.error("facts: could not read what's stored:", error);
    return NextResponse.json({ facts: null });
  }
}

/**
 * Looks this bottle up.
 *
 * `{"refresh": true}` ignores whatever is on file and searches again — that's
 * the Refresh button. Without it, anything already stored comes straight back,
 * which is what the first view of a bottle wants: this used to force a search
 * every time, so the client had to ask separately whether a search was needed
 * at all, and that question cost a round trip before the search could start.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { refresh?: unknown };
  const refresh = body.refresh === true;

  const wine = await getWine(id);
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lookup = await getWineFacts(wine, refresh);
  if (lookup.status === "unavailable") {
    return NextResponse.json({ error: lookup.message }, { status: 502 });
  }

  return NextResponse.json({ facts: lookup.facts, warning: lookup.warning });
}
