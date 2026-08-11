import { NextResponse } from "next/server";
import { getWineFacts } from "@/lib/wine-facts";
import { getWine } from "@/lib/wines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Searching the web and filing the result runs well past the default budget. */
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Looks this bottle up again, ignoring whatever is already on file. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wine = await getWine(id);
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lookup = await getWineFacts(wine, true);
  if (lookup.status === "unavailable") {
    return NextResponse.json({ error: lookup.message }, { status: 502 });
  }

  return NextResponse.json({ facts: lookup.facts, warning: lookup.warning });
}
