import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
