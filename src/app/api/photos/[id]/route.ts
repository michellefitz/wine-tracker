import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
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

  const bytes = Buffer.from(photo.data, "base64");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(bytes.length),
      // Photo bytes never change once written, and the ID is unguessable.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
