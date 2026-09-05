import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { cutOut } from "@/lib/photo-cutout";

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
      // Content-Length is deliberately not set: the platform may compress the
      // body after this returns, and a stale length is a truncated picture.
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

  let photo: { mime: string; data: string } | undefined;
  try {
    const db = sql();
    const rows = await db.query(`SELECT mime, data FROM photos WHERE id = $1`, [id]);
    photo = (rows as { mime: string; data: string }[])[0];
  } catch (error) {
    // An unhandled throw here becomes a 500 HTML page, which an <img> renders
    // as a broken picture and nobody ever sees the reason for.
    console.error("photos: could not read photo:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not read that photo" }, { status: 503 });
  }

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const original = Buffer.from(photo.data, "base64");

  const query = new URL(request.url).searchParams;
  const requested = Number(query.get("w"));
  if (!WIDTHS.has(requested)) {
    return respond(original, photo.mime);
  }

  const acceptsWebp = (request.headers.get("accept") ?? "").includes("image/webp");

  /*
   * ?cut=1 asks for the bottle without its background, so the country outline
   * on the detail page has somewhere to show through.
   *
   * Asking is all the caller can do: whether a picture can be cut depends on
   * the picture, and a photo of a bottle on a table can't be. That decision is
   * made where the pixels are and it comes back as a plain opaque image when
   * the answer is no, which is why nothing upstream has to know or ask first.
   * The page renders the same either way; on a photo that can't be cut, the
   * outline is simply hidden behind it, as it was before any of this.
   */
  if (query.get("cut") === "1") {
    const cut = await cutOut(original, { width: requested, webp: acceptsWebp });
    if (cut) return respond(cut.data, cut.mime, true);
  }

  /*
   * A label photo off a phone is ~1100px wide; a card shows it at a third of
   * that. Sending the full thing is most of what makes the log slow to paint.
   *
   * Resizing is an optimisation, and an optimisation may never be the reason a
   * photo doesn't appear. sharp is loaded here rather than at the top of the
   * file for exactly that reason: a native module that won't load on the
   * serverless runtime would otherwise take the whole route down with it, and
   * a route that throws returns an HTML error page, which an <img> shows as a
   * broken picture. Either way — can't load, or can't encode — the stored
   * photo goes out as it is.
   */
  try {
    const sharp = (await import("sharp")).default;
    const pipeline = sharp(original).resize({ width: requested, withoutEnlargement: true });
    const bytes = acceptsWebp
      ? await pipeline.webp({ quality: 72 }).toBuffer()
      : await pipeline.jpeg({ quality: 76, mozjpeg: true }).toBuffer();
    return respond(bytes, acceptsWebp ? "image/webp" : "image/jpeg", true);
  } catch (error) {
    console.error("photos: could not resize:", error instanceof Error ? error.message : error);
    return respond(original, photo.mime);
  }
}
