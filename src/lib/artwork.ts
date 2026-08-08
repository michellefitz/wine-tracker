/**
 * Looks for a clean product shot of a wine to stand in for a hurried camera
 * photo.
 *
 * Source is Open Food Facts: open data, an API that welcomes queries rather
 * than blocking them, and photos contributed under CC-BY-SA. Every supermarket
 * and retailer site tested returns 403 to a server-side fetch, so scraping them
 * is not an option even setting the licensing aside.
 *
 * The search is deliberately never trusted on its own — it returns a confident
 * wrong bottle far more often than it returns nothing (searching "Bodega Norton
 * Reserva Malbec" offers a Rioja from a different producer). Candidates found
 * here are checked against the photo you actually took before any of them is
 * offered. See /api/artwork.
 */

const USER_AGENT = "CellarNotes/0.1 (personal wine log)";

/** The only host we ever download bytes from, so a bad result can't redirect us. */
const IMAGE_HOST = "images.openfoodfacts.org";

const SEARCH_TIMEOUT_MS = 8000;
const IMAGE_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 1_500_000;

export type Candidate = {
  code: string;
  label: string;
  imageUrl: string;
};

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Candidate product shots for a wine, most promising first. Constrained to the
 * wine category — without it the index happily answers "Tesco Finest Malbec"
 * with a photo of mixed peppers.
 */
export async function findCandidates(query: string, limit = 4): Promise<Candidate[]> {
  const url = new URL("https://search.openfoodfacts.org/search");
  url.searchParams.set("q", `${query} categories_tags:"en:wines"`);
  url.searchParams.set("page_size", String(limit));

  let payload: { hits?: Record<string, unknown>[] };
  try {
    payload = await withTimeout(SEARCH_TIMEOUT_MS, async (signal) => {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal,
      });
      if (!response.ok) throw new Error(`search HTTP ${response.status}`);
      return (await response.json()) as { hits?: Record<string, unknown>[] };
    });
  } catch (error) {
    console.error("artwork: search failed:", error instanceof Error ? error.message : error);
    return [];
  }

  const candidates: Candidate[] = [];
  for (const hit of payload.hits ?? []) {
    const imageUrl = typeof hit.image_front_url === "string" ? hit.image_front_url : null;
    if (!imageUrl) continue;

    // Never follow a URL to anywhere but the image host we expect.
    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      continue;
    }
    if (parsed.protocol !== "https:" || parsed.hostname !== IMAGE_HOST) continue;

    const label = [hit.brands, hit.product_name]
      .filter((part): part is string => typeof part === "string" && part.trim() !== "")
      .join(" — ");
    if (!label) continue;

    candidates.push({ code: String(hit.code ?? ""), label, imageUrl: parsed.toString() });
  }

  return candidates;
}

/** Downloads a candidate image, refusing anything that isn't a modest JPEG/PNG/WebP. */
export async function fetchImage(
  imageUrl: string,
): Promise<{ mime: string; base64: string } | null> {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== IMAGE_HOST) return null;

  try {
    return await withTimeout(IMAGE_TIMEOUT_MS, async (signal) => {
      const response = await fetch(parsed, {
        headers: { "User-Agent": USER_AGENT },
        signal,
        redirect: "error",
      });
      if (!response.ok) return null;

      const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) return null;

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;

      return { mime, base64: bytes.toString("base64") };
    });
  } catch (error) {
    console.error("artwork: image fetch failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** What we search for, given whatever the label reader managed to pull off the bottle. */
export function buildQuery(fields: {
  producer?: string | null;
  name?: string | null;
  grapes?: string[];
}): string | null {
  const parts = [fields.producer, fields.name]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .map((part) => part.trim());

  if (parts.length === 0) return null;
  return parts.join(" ").slice(0, 120);
}
