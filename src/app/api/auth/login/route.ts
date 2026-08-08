import { NextResponse } from "next/server";
import { AUTH_COOKIE, cookieMaxAgeSeconds, createToken } from "@/lib/auth";

export const runtime = "nodejs";

/** Slows down anyone trying passcodes in a loop. */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const passcode = process.env.APP_PASSCODE;
  const secret = process.env.AUTH_SECRET;

  if (!passcode || !secret) {
    return NextResponse.json(
      { error: "APP_PASSCODE and AUTH_SECRET must be set on the server" },
      { status: 500 },
    );
  }

  let submitted = "";
  try {
    const body = (await request.json()) as { passcode?: unknown };
    submitted = typeof body.passcode === "string" ? body.passcode : "";
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  await delay(400);

  if (submitted !== passcode) {
    return NextResponse.json({ error: "That passcode doesn't match." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await createToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookieMaxAgeSeconds(),
  });
  return response;
}
