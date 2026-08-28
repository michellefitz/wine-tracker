import { sql } from "@/lib/db";

/**
 * Where a picture arrives from, for the routes that take one.
 *
 * Adding a wine sends the photo the browser has just compressed and has not
 * stored yet; going back to change a picture on a bottle already in the log
 * sends its id, and the bytes are read here rather than pulled down to the
 * phone and posted straight back a third larger for having been base64'd on
 * the way. Three routes wanted both, and three copies of this is how one of
 * them ends up with a different size limit from the others.
 */

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BASE64_LENGTH = 2_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Photo = { mime: string; base64: string };

export type PhotoInput =
  | { ok: true; photo: Photo }
  | { ok: false; status: number; error: string };

export async function readPhoto(body: {
  dataUrl?: unknown;
  photoId?: unknown;
}): Promise<PhotoInput> {
  let photo: Photo;

  if (typeof body.photoId === "string") {
    if (!UUID.test(body.photoId)) {
      return { ok: false, status: 404, error: "Not found" };
    }
    let row: { mime: string; data: string } | undefined;
    try {
      const db = sql();
      const rows = await db.query(`SELECT mime, data FROM photos WHERE id = $1`, [body.photoId]);
      row = (rows as { mime: string; data: string }[])[0];
    } catch (error) {
      console.error("photo-input: could not read:", error instanceof Error ? error.message : error);
      return { ok: false, status: 503, error: "Could not read that photo" };
    }
    if (!row) return { ok: false, status: 404, error: "Not found" };
    photo = { mime: row.mime, base64: row.data };
  } else {
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
    const parsed = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!parsed) {
      return { ok: false, status: 400, error: "Expected a base64 data URL or a photo id" };
    }
    photo = { mime: parsed[1], base64: parsed[2] };
  }

  if (!ALLOWED_MIME.has(photo.mime) || photo.base64.length > MAX_BASE64_LENGTH) {
    return { ok: false, status: 415, error: "Unsupported or oversized image" };
  }
  return { ok: true, photo };
}
