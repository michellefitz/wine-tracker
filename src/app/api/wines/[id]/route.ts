import { NextResponse } from "next/server";
import { ValidationError, deleteWine, getWine, normalizeInput, updateWine } from "@/lib/wines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wine = await getWine(id);
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ wine });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const wine = await updateWine(id, normalizeInput(await request.json()));
    if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ wine });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("wines: update failed:", error);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const removed = await deleteWine(id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
