import { NextResponse } from "next/server";
import { ValidationError, createWine, listWines, normalizeInput } from "@/lib/wines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ wines: await listWines() });
}

export async function POST(request: Request) {
  try {
    const wine = await createWine(normalizeInput(await request.json()));
    return NextResponse.json({ wine }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("wines: create failed:", error);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
}
