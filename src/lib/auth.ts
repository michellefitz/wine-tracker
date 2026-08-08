/**
 * Single-user passcode gate.
 *
 * The cookie holds `<expiry-ms>.<hmac>` signed with AUTH_SECRET. Uses Web
 * Crypto so the same code runs in middleware (Edge) and route handlers (Node).
 */

export const AUTH_COOKIE = "wt_auth";
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

/** Length-independent comparison, so we don't leak the signature byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createToken(secret: string, ttlMs: number = YEAR_MS): Promise<string> {
  const expiry = String(Date.now() + ttlMs);
  return `${expiry}.${await hmac(secret, expiry)}`;
}

export async function verifyToken(secret: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const separator = token.indexOf(".");
  if (separator < 1) return false;

  const expiry = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!timingSafeEqual(signature, await hmac(secret, expiry))) return false;

  const expiresAt = Number(expiry);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function cookieMaxAgeSeconds(): number {
  return Math.floor(YEAR_MS / 1000);
}
