import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

/** Paths that must stay reachable without a session. */
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/manifest.webmanifest",
  "/sw.js",
  // The service worker caches this at install time, which can happen before
  // the passcode is entered. It holds no data of yours.
  "/offline.html",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/icons/")) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Failing closed beats silently serving an unprotected log.
    return new NextResponse("AUTH_SECRET is not configured", { status: 500 });
  }

  if (await verifyToken(secret, request.cookies.get(AUTH_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
