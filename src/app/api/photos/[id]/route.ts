import { NextResponse } from "next/server";
import sharp from "sharp";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The sizes the app actually asks for: 560 for a card in the two-column grid
 * (167 CSS px at a phone's 3x density), 960 for the detail page. Anything else
 * is ignored and the original comes back, so a stray `?w=` can't make the
 * server do arbitrary work.
 */
const WIDTHS = new Set([320, 560, 960]);

function respond(bytes: Buffer, mime: string, vary = false) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      // Photo bytes never change once written, and the ID is unguessable. The
      // width is part of the URL, so each variant caches independently.
      "Cache-Control": "private, max-age=31536000, immutable",
      ...(vary ? { Vary: "Accept" } : {}),
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = sql();
  const rows = await db.query(`SELECT mime, data FROM photos WHERE id = $1`, [id]);
  const photo = (rows as { mime: string; data: string }[])[0];
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const original = Buffer.from(photo.data, "base64");

  const requested = Number(new URL(request.url).searchParams.get("w"));
  if (!WIDTHS.has(requested)) {
    return respond(original, photo.mime);
  }

  // A label photo off a phone is ~1100px wide; a card shows it at a third of
  // that. Sending the full thing is most of what makes the log slow to paint.
  const acceptsWebp = (request.headers.get("accept") ?? "").includes("image/webp");
  try {
    const pipeline = sharp(original).resize({ width: requested, withoutEnlargement: true });
    const bytes = acceptsWebp
      ? await pipeline.webp({ quality: 72 }).toBuffer()
      : await pipeline.jpeg({ quality: 76, mozjpeg: true }).toBuffer();
    return respond(bytes, acceptsWebp ? "image/webp" : "image/jpeg", true);
  } catch (error) {
    // A photo we can't re-encode is still a photo — send it as it was stored.
    console.error("photos: resize failed:", error instanceof Error ? error.message : error);
    return respond(original, photo.mime);
  }
}
