import { flatten } from "@/lib/text";

/**
 * Naming and matching the places a lookup got its facts from.
 *
 * Search results come back with a page title, which for a wine is almost always
 * just the wine's own name — so a list of them reads as the same wine six
 * times, with no clue whether you're about to open Vivino or a supermarket.
 * The site is in the URL; it only ever needed reading out.
 */

/** Sites worth naming properly, because the domain doesn't say it. */
const KNOWN_SITES: [RegExp, string][] = [
  [/(^|\.)vivino\.com$/, "Vivino"],
  [/(^|\.)winemag\.com$/, "Wine Enthusiast"],
  [/(^|\.)decanter\.com$/, "Decanter"],
  [/(^|\.)winespectator\.com$/, "Wine Spectator"],
  [/(^|\.)jamessuckling\.com$/, "James Suckling"],
  [/(^|\.)jancisrobinson\.com$/, "Jancis Robinson"],
  [/(^|\.)wine-searcher\.com$/, "Wine-Searcher"],
  [/(^|\.)winefolly\.com$/, "Wine Folly"],
  [/(^|\.)cellartracker\.com$/, "CellarTracker"],
  [/(^|\.)wine\.com$/, "Wine.com"],
  [/(^|\.)tesco\.(com|ie)$/, "Tesco"],
  [/dunnesstores/, "Dunnes Stores"],
  [/(^|\.)supervalu\.ie$/, "SuperValu"],
  [/(^|\.)marksandspencer\.(com|ie)$/, "M&S"],
  [/(^|\.)majestic\.co\.uk$/, "Majestic"],
  [/(^|\.)waitrose\.com$/, "Waitrose"],
  [/(^|\.)ocado\.com$/, "Ocado"],
  [/(^|\.)laithwaites\.(com|co\.uk|ie)$/, "Laithwaites"],
  [/(^|\.)nakedwines\.(com|co\.uk|ie)$/, "Naked Wines"],
  [/(^|\.)oddbins\.com$/, "Oddbins"],
  [/(^|\.)lidl\.(ie|co\.uk|com)$/, "Lidl"],
  [/(^|\.)aldi\.(ie|co\.uk|com)$/, "Aldi"],
  [/(^|\.)wikipedia\.org$/, "Wikipedia"],
];

/** The name of the site a URL points at, for a person rather than a browser. */
export function siteName(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Source";
  }

  const known = KNOWN_SITES.find(([pattern]) => pattern.test(host));
  if (known) return known[1];

  // Otherwise the domain itself, minus the suffix: "bodegacolome.com.ar" reads
  // back as "Bodegacolome", which is at least a place and not a wine name.
  const parts = host.split(".");
  const suffixes = parts.length > 2 && parts[parts.length - 2].length <= 3 ? 2 : 1;
  const name = parts[Math.max(0, parts.length - suffixes - 1)] ?? host;

  return name
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join("-");
}

/** Domains for reviewers whose site name isn't their own name. */
const REVIEWER_DOMAINS: Record<string, RegExp> = {
  "wine enthusiast": /winemag\.com/,
  "wine advocate": /robertparker\.com/,
  "robert parker": /robertparker\.com/,
};

/**
 * The page a given review came from, if the search actually returned it.
 *
 * Matching is by site, not by guesswork: a Vivino score links to the Vivino
 * page that was read, or to nothing at all. An invented link would be worse
 * than a score you have to look up yourself.
 */
export function sourceFor(
  reviewer: string,
  sources: { title: string; url: string }[],
): string | null {
  const name = flatten(reviewer);
  if (!name) return null;

  const domain = REVIEWER_DOMAINS[name];
  const squashed = name.replace(/ /g, "");

  const hit = sources.find((source) => {
    let host: string;
    try {
      host = new URL(source.url).hostname.toLowerCase();
    } catch {
      return false;
    }
    if (domain?.test(host)) return true;
    return host.replace(/[^a-z0-9]/g, "").includes(squashed);
  });

  return hit?.url ?? null;
}
