import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Finding a clean bottle shot on the pages the web already knows about.
 *
 * Open Food Facts is a food database. Its wine coverage is thin and its
 * pictures are photographs members took in supermarkets, which is why the
 * "product shot" it offers is often blurrier than the one you took yourself.
 * A producer's own site, or a merchant's listing, almost always carries a
 * studio shot of the bottle on white — and almost always declares it as the
 * page's og:image, because that is the picture they want shown when the page
 * is shared. That is a far better source, and it costs one fetch.
 *
 * Reading pages the app didn't choose means fetching URLs that ultimately came
 * off the open web, so everything here is written as though those URLs are
 * hostile: https only, every hostname resolved and checked against the private
 * ranges before a connection is made, redirects followed by hand with the same
 * check each time, and hard caps on size and time. The prize is a picture of a
 * wine bottle. It is not worth a request to something inside the network.
 */

const PAGE_TIMEOUT_MS = 6000;
const MAX_PAGE_BYTES = 900_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "CellarNotes/0.1 (personal wine log)";

/** Everything that must never be reachable from a URL found on the web. */
function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    return (
      value === "::" ||
      value === "::1" ||
      value.startsWith("fe80") || // link-local
      value.startsWith("fc") || // unique local
      value.startsWith("fd") ||
      value.startsWith("::ffff:") // an IPv4 address wearing a hat
    );
  }

  const [a, b] = address.split(".").map(Number);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return true;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, and the cloud metadata service
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    a >= 224 // multicast and reserved
  );
}

/**
 * The URL, if it's safe to fetch — parsed, https, and pointing at a public
 * address. Returns null rather than throwing: an unusable candidate is an
 * ordinary outcome here, not an error.
 */
export async function safeUrl(candidate: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (!url.hostname || url.hostname.endsWith(".local")) return null;

  // A literal address skips DNS but not the check.
  if (isIP(url.hostname)) {
    return isPrivateAddress(url.hostname) ? null : url;
  }

  try {
    const addresses = await lookup(url.hostname, { all: true });
    if (addresses.length === 0) return null;
    if (addresses.some((entry) => isPrivateAddress(entry.address))) return null;
  } catch {
    return null;
  }

  return url;
}

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The page's HTML, following redirects by hand so each hop is checked.
 *
 * `redirect: "manual"` matters: letting fetch follow them would mean a public
 * URL could bounce the request to a private one, which is the whole trick the
 * address check exists to stop.
 */
type Loaded = { html: string; url: URL };
type Hop = Loaded | { redirect: string | null };

async function fetchPage(start: URL): Promise<Loaded | null> {
  let url: URL | null = start;

  for (let hop = 0; hop <= MAX_REDIRECTS && url; hop += 1) {
    const here: URL = url;
    const result = await withTimeout<Hop | null>(PAGE_TIMEOUT_MS, async (signal): Promise<Hop | null> => {
      const response = await fetch(here, {
        signal,
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        return { redirect: location ? new URL(location, here).toString() : null };
      }
      if (!response.ok) return null;

      const type = (response.headers.get("content-type") ?? "").toLowerCase();
      if (!type.includes("html")) return null;

      const body = await response.arrayBuffer();
      if (body.byteLength > MAX_PAGE_BYTES) {
        return { html: Buffer.from(body.slice(0, MAX_PAGE_BYTES)).toString("utf8"), url: here };
      }
      return { html: Buffer.from(body).toString("utf8"), url: here };
    });

    if (!result) return null;
    if ("html" in result) return result;

    url = result.redirect ? await safeUrl(result.redirect) : null;
  }

  return null;
}

const META = /<meta\s+[^>]*>/gi;
const ATTR = (name: string) => new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
const JSON_LD = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function attribute(tag: string, name: string): string | null {
  return tag.match(ATTR(name))?.[1]?.trim() ?? null;
}

/**
 * Every picture the page nominates as its own, best first.
 *
 * og:image is what a page wants shown when it's shared, which on a product
 * page is the product. twitter:image is the same idea and occasionally
 * differs. The JSON-LD `image` is the machine-readable version merchants
 * publish for search engines, and is often the largest of the three.
 */
export function imagesIn(html: string, pageUrl: string): string[] {
  const found: string[] = [];

  const add = (value: string | null | undefined) => {
    if (!value) return;
    try {
      const resolved = new URL(value, pageUrl).toString();
      if (!found.includes(resolved)) found.push(resolved);
    } catch {
      // A relative URL we can't resolve is simply not a candidate.
    }
  };

  for (const tag of html.match(META) ?? []) {
    const key = (attribute(tag, "property") ?? attribute(tag, "name") ?? "").toLowerCase();
    if (key === "og:image" || key === "og:image:secure_url" || key === "twitter:image") {
      add(attribute(tag, "content"));
    }
  }

  for (const block of html.matchAll(JSON_LD)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    // The shape varies wildly between merchants; walk it rather than assume.
    const stack: unknown[] = [parsed];
    while (stack.length > 0) {
      const node = stack.pop();
      if (Array.isArray(node)) {
        stack.push(...node);
      } else if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) {
          if (key === "image") {
            if (typeof value === "string") add(value);
            else if (Array.isArray(value)) value.forEach((entry) => typeof entry === "string" && add(entry));
            else if (value && typeof value === "object" && "url" in value) {
              add(String((value as { url: unknown }).url));
            }
          } else if (value && typeof value === "object") {
            stack.push(value);
          }
        }
      }
    }
  }

  return found;
}

/**
 * Candidate bottle shots from a handful of pages about this wine.
 *
 * The pages come from the lookup that already ran for the write-up, so this
 * usually costs no search — just a fetch each, in parallel, with anything slow
 * or unreachable simply dropped.
 */
export async function shotsFromPages(
  pages: { title: string; url: string }[],
  limit = 4,
): Promise<{ label: string; imageUrl: string }[]> {
  const safe = (await Promise.all(pages.slice(0, limit).map((page) => safeUrl(page.url))))
    .map((url, index) => (url ? { url, title: pages[index].title } : null))
    .filter((entry): entry is { url: URL; title: string } => entry !== null);

  const fetched = await Promise.all(
    safe.map(async (page) => {
      const loaded = await fetchPage(page.url);
      if (!loaded) return null;
      const images = imagesIn(loaded.html, loaded.url.toString());
      return images[0] ? { label: page.title || loaded.url.hostname, imageUrl: images[0] } : null;
    }),
  );

  return fetched.filter((entry): entry is { label: string; imageUrl: string } => entry !== null);
}
