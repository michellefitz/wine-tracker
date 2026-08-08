import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BASE64_LENGTH = 2_000_000; // ~1.5 MB decoded, safely under Vercel's request cap

/**
 * Stores a label photo. The client downscales and re-encodes to JPEG before
 * posting, so these land at roughly 100-200 KB each.
 */
export async function POST(request: Request) {
  let dataUrl = "";
  try {
    const body = (await request.json()) as { dataUrl?: unknown };
    dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Expected a base64 data URL" }, { status: 400 });
  }

  const [, mime, base64] = match;
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: `Unsupported image type: ${mime}` }, { status: 415 });
  }
  if (base64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "That image is too large" }, { status: 413 });
  }

  const db = sql();
  const rows = await db.query(
    `INSERT INTO photos (mime, data) VALUES ($1, $2) RETURNING id`,
    [mime, base64],
  );

  return NextResponse.json({ id: (rows as { id: string }[])[0].id }, { status: 201 });
}
