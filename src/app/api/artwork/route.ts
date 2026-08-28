import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildQuery, fetchImage, findCandidates } from "@/lib/artwork";
import { shotsFromPages } from "@/lib/product-shot";
import { findFacts } from "@/lib/wine-facts";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
const MAX_CANDIDATES = 4;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BASE64_LENGTH = 2_000_000;

/**
 * The whole feature rests on this prompt saying "none" often enough. A product
 * search returns a plausible wrong bottle far more readily than it returns
 * nothing, so the default has to be rejection.
 */
const SYSTEM_PROMPT = `You compare a photograph of a wine bottle against candidate product shots
and decide whether any of them is the same wine.

The first image is the photograph the user took. The images after it are candidates — some from a
product database, some the main image of a web page about a wine — each preceded by its name or
the page's title. A page's main image is not always the bottle: it may be a vineyard, a cellar, a
person, a region, a logo, or a photograph of several different wines. None of those are matches.

Say a candidate matches only if it is the same wine: same producer and same specific cuvée or
range. Judge on the label — its wording, layout, typography, colours and crest — not on the
bottle's shape or colour, which are near-identical across most wines.

These are NOT matches, and you should return null for all of them:
- The same producer but a different wine (a Chardonnay when the photo shows a Malbec)
- The same grape or region from a different producer
- A supermarket own-label wine that merely shares a grape name
- A different format or product (a grappa rather than the wine, a gift set)

A different vintage year of the same wine IS a match — labels rarely change between years.

Returning null is the expected outcome. The user keeps their own photo when nothing matches,
which is a perfectly good result. A wrong bottle is far worse than no bottle.`;

const SCHEMA = {
  type: "object",
  properties: {
    match_index: {
      anyOf: [{ type: "integer" }, { type: "null" }],
      description: "0-based index of the matching candidate, or null if none match.",
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reason: { type: "string" },
  },
  required: ["match_index", "confidence", "reason"],
  additionalProperties: false,
} as const;

type Verdict = { match_index: number | null; confidence: string; reason: string };

/** The pages the write-up cited for this bottle, if it has been looked up. */
async function citedPages(wineId: string | null): Promise<{ title: string; url: string }[]> {
  if (!wineId) return [];
  try {
    return (await findFacts(wineId))?.sources ?? [];
  } catch (error) {
    console.error("artwork: could not read sources:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ found: false, reason: "Label matching is not configured." });
  }

  let body: { dataUrl?: unknown; photoId?: unknown; producer?: unknown; name?: unknown; wineId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  /*
   * Adding a wine sends the photo it just took; going back to fix a picture on
   * a bottle already in the log sends its id, and the photo is read here rather
   * than pulled down and posted straight back a third larger for the trip.
   */
  let userMime: string;
  let userBase64: string;

  if (typeof body.photoId === "string" && UUID.test(body.photoId)) {
    let stored: { mime: string; data: string } | undefined;
    try {
      const db = sql();
      const rows = await db.query(`SELECT mime, data FROM photos WHERE id = $1`, [body.photoId]);
      stored = (rows as { mime: string; data: string }[])[0];
    } catch (error) {
      console.error("artwork: could not read photo:", error instanceof Error ? error.message : error);
      return NextResponse.json({ found: false, reason: "Couldn't read your photo." });
    }
    if (!stored) return NextResponse.json({ error: "Not found" }, { status: 404 });
    userMime = stored.mime;
    userBase64 = stored.data;
  } else {
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
    const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Expected a base64 data URL or a photo id" }, { status: 400 });
    }
    [, userMime, userBase64] = match;
  }

  if (!ALLOWED_MIME.has(userMime) || userBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "Unsupported or oversized image" }, { status: 415 });
  }

  const query = buildQuery({
    producer: typeof body.producer === "string" ? body.producer : null,
    name: typeof body.name === "string" ? body.name : null,
  });
  if (!query) {
    return NextResponse.json({ found: false, reason: "Not enough label text to search on." });
  }

  /*
   * Two places to look, and the second is usually the better one.
   *
   * Open Food Facts is a food database: its wine coverage is thin and its
   * pictures are photographs people took in shops, which is how a "product
   * shot" ends up blurrier than the one you took yourself. The pages the
   * write-up already cited — the producer, a merchant, a wine site — carry a
   * studio shot of the bottle far more often, and cost no new search because
   * that lookup has already run.
   */
  const [database, pages] = await Promise.all([
    findCandidates(query).catch(() => []),
    citedPages(typeof body.wineId === "string" ? body.wineId : null).then(shotsFromPages).catch(() => []),
  ]);

  const candidates = [...pages, ...database].slice(0, MAX_CANDIDATES);
  if (candidates.length === 0) {
    return NextResponse.json({ found: false, reason: "No product shots found for that wine." });
  }

  // Download in parallel; drop any that won't come down cleanly.
  const downloaded = (
    await Promise.all(
      candidates.map(async (candidate) => {
        const image = await fetchImage(candidate.imageUrl);
        return image ? { ...candidate, image } : null;
      }),
    )
  ).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (downloaded.length === 0) {
    return NextResponse.json({ found: false, reason: "No product shots could be loaded." });
  }

  const content: Anthropic.ContentBlockParam[] = [
    { type: "text", text: "The photograph the user took:" },
    {
      type: "image",
      source: { type: "base64", media_type: userMime as "image/jpeg", data: userBase64 },
    },
  ];
  downloaded.forEach((candidate, index) => {
    content.push({ type: "text", text: `Candidate ${index}: ${candidate.label}` });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: candidate.image.mime as "image/jpeg",
        data: candidate.image.base64,
      },
    });
  });
  content.push({
    type: "text",
    text: "Which candidate, if any, is the same wine as the photograph? Return null if unsure.",
  });

  let verdict: Verdict;
  try {
    const response = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ found: false, reason: "Couldn't compare those images." });
    }
    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ found: false, reason: "No comparison came back." });
    }
    verdict = JSON.parse(text.text) as Verdict;
  } catch (error) {
    console.error("artwork: verification failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ found: false, reason: "Couldn't check the product shots." });
  }

  const index = verdict.match_index;
  // Low confidence is treated as no match: a wrong bottle is worse than none.
  if (
    index === null ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= downloaded.length ||
    verdict.confidence === "low"
  ) {
    return NextResponse.json({
      found: false,
      reason: "Nothing in the database matched your bottle.",
    });
  }

  const chosen = downloaded[index];
  return NextResponse.json({
    found: true,
    label: chosen.label,
    confidence: verdict.confidence,
    dataUrl: `data:${chosen.image.mime};base64,${chosen.image.base64}`,
  });
}
