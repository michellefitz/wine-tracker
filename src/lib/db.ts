import { neon } from "@neondatabase/serverless";

let cached: ReturnType<typeof neon> | null = null;

/**
 * Neon's HTTP driver. One round trip per query, no connection pooling to
 * manage — which is what we want on Vercel's serverless functions.
 */
export function sql() {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    cached = neon(url);
  }
  return cached;
}
