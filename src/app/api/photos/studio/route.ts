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
    const message = error instanceof Error ? error.message : String(error);
    console.error("studio: generation failed:", message);
    return NextResponse.json({
      generated: false,
      reason: /abort|timeout/i.test(message)
        ? "The studio shot took too long and was given up on."
        : "That photo couldn't be restaged.",
    });
  }
}
