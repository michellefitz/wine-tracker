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
  wineenthusiast: /winemag\.com/,
  wineadvocate: /robertparker\.com/,
  robertparker: /robertparker\.com/,
  winespectator: /winespectator\.com/,
};

/**
 * Words that name no site on their own. "Wine" would match winemag.com,
 * wine.com and wine-searcher.com equally, which is three wrong answers.
 */
const TOO_GENERIC = new Set([
  "wine", "wines", "the", "and", "com", "review", "reviews", "rating", "ratings",
  "vintage", "page", "community", "overall", "score", "scores", "points", "critic",
  "guide", "tasting", "tastings", "notes", "official", "producer", "winery",
]);

/**
 * The site names hiding inside a reviewer label.
 *
 * Reviewers don't arrive as bare brands. They arrive as "Vivino (2018 vintage
 * page)" and "Tastings.com / BevTest (2016 vintage)" — the brand, then a
 * qualifier saying which page it was. So the qualifier in brackets comes off
 * first, then the rest splits on the separators that join two names, and the
 * longest candidate is tried first because it's the most specific.
 */
function candidates(reviewer: string): string[] {
  const unqualified = reviewer.replace(/\([^)]*\)/g, " ");

  return unqualified
    .split(/[/,;|]|—|–|\s-\s/)
    .map((part) => flatten(part).replace(/ /g, ""))
    .filter((part) => part.length >= 4 && !TOO_GENERIC.has(part))
    .sort((a, b) => b.length - a.length);
}

/** The year a reviewer label is talking about, when it names one. */
function vintageIn(text: string): string | null {
  return text.match(/\b(19|20)\d{2}\b/)?.[0] ?? null;
}

/**
 * The page a given review came from, if the search actually returned it.
 *
 * Matching is by site, not by guesswork: a Vivino score links to the Vivino
 * page that was read, or to nothing at all. An invented link would be worse
 * than a score you have to look up yourself. Where a reviewer names a vintage
 * and one of that site's pages carries the same year, that page wins — three
 * Vivino rows for three vintages shouldn't all open the same one.
 */
export function sourceFor(
  reviewer: string,
  sources: { title: string; url: string }[],
): string | null {
  const wanted = candidates(reviewer);
  if (wanted.length === 0) return null;

  const hosts = sources.map((source) => {
    try {
      return { source, host: new URL(source.url).hostname.toLowerCase().replace(/[^a-z0-9]/g, "") };
    } catch {
      return { source, host: "" };
    }
  });

  for (const candidate of wanted) {
    const domain = REVIEWER_DOMAINS[candidate];
    const onSite = hosts.filter(({ source, host }) =>
      domain ? domain.test(source.url) : host.includes(candidate),
    );
    if (onSite.length === 0) continue;

    const year = vintageIn(reviewer);
    const sameYear = year
      ? onSite.find(({ source }) => `${source.url} ${source.title}`.includes(year))
      : undefined;

    return (sameYear ?? onSite[0]).source.url;
  }

  return null;
}
