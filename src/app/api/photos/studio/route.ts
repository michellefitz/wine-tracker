import { NextResponse } from "next/server";
import { readPhoto } from "@/lib/photo-input";
import { studioShot } from "@/lib/studio-shot";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Your bottle, restaged under studio lighting.
 *
 * Never automatic, in either flow. It costs a generation per press, it takes
 * the best part of a minute, and it hands back a picture that is not
 * photographic evidence of anything — all three of which are reasons it should
 * happen because you asked for it and not because you added a wine.
 */
export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      generated: false,
      reason: "Studio shots aren't set up: GEMINI_API_KEY isn't configured on the server.",
    });
  }

  let body: { dataUrl?: unknown; photoId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const input = await readPhoto(body);
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: input.status });
  }

  try {
    const shot = await studioShot(input.photo);
    if (!shot) {
      return NextResponse.json({
        generated: false,
        reason: "No studio shot came back for that photo.",
      });
    }
    return NextResponse.json({
      generated: true,
      dataUrl: `data:${shot.mime};base64,${shot.base64}`,
    });
  } catch (error) {
    console.error("studio: generation failed:", error);
    return NextResponse.json({ generated: false, reason: explain(error) });
  }
}

/** Anything that looks like a credential, gone before it reaches a screen. */
function redact(text: string): string {
  return text
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, "AIza…")
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "sk-…")
    .replace(/(key=)[^&\s"']+/gi, "$1…");
}

/**
 * What actually went wrong, in the reply rather than only in the logs.
 *
 * This used to return "That photo couldn't be restaged." for everything, which
 * is a sentence with no next step in it: a model your key can't reach, a
 * rejected field and a dead network all looked identical from the outside, and
 * the only way to tell them apart was a Vercel log nobody was watching. On a
 * private single-user app the API's own words are the most useful thing that
 * can be on screen — minus anything key-shaped, and minus the volume.
 */
function explain(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/abort|timeout|timed out/i.test(message)) {
    return "The studio shot took too long and was given up on.";
  }

  const status = (error as { status?: unknown; statusCode?: unknown } | null)?.status ??
    (error as { statusCode?: unknown } | null)?.statusCode;

  const detail = redact(message).replace(/\s+/g, " ").trim().slice(0, 400);
  const code = typeof status === "number" ? ` (HTTP ${status})` : "";
  return detail ? `The image API said${code}: ${detail}` : `The image API failed${code}.`;
}
