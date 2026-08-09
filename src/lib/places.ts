/**
 * Turns the free-text country the label reader gives us into a flag.
 *
 * The country field is never constrained — it's whatever the model read off the
 * bottle, or whatever you typed — so the lookup has to be forgiving: case,
 * accents, punctuation and the usual alternate names all resolve to the same
 * place. Anything unrecognised simply gets no flag, which is a fine outcome.
 */

/** Wine-producing countries, plus the alternate names labels actually use. */
const ISO_BY_NAME: Record<string, string> = {
  // Western Europe
  france: "FR",
  italy: "IT",
  italia: "IT",
  spain: "ES",
  espana: "ES",
  portugal: "PT",
  germany: "DE",
  deutschland: "DE",
  austria: "AT",
  osterreich: "AT",
  switzerland: "CH",
  luxembourg: "LU",
  netherlands: "NL",
  holland: "NL",
  belgium: "BE",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  britain: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  ireland: "IE",
  malta: "MT",

  // Central, eastern and south-eastern Europe
  greece: "GR",
  hungary: "HU",
  romania: "RO",
  bulgaria: "BG",
  croatia: "HR",
  slovenia: "SI",
  slovakia: "SK",
  czechia: "CZ",
  "czech republic": "CZ",
  czech: "CZ",
  poland: "PL",
  serbia: "RS",
  montenegro: "ME",
  "north macedonia": "MK",
  macedonia: "MK",
  "bosnia and herzegovina": "BA",
  bosnia: "BA",
  albania: "AL",
  moldova: "MD",
  ukraine: "UA",
  russia: "RU",
  georgia: "GE",
  armenia: "AM",
  azerbaijan: "AZ",

  // Mediterranean and Middle East
  cyprus: "CY",
  turkey: "TR",
  turkiye: "TR",
  lebanon: "LB",
  israel: "IL",

  // Africa
  "south africa": "ZA",
  morocco: "MA",
  algeria: "DZ",
  tunisia: "TN",
  egypt: "EG",

  // Americas
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  america: "US",
  canada: "CA",
  mexico: "MX",
  argentina: "AR",
  chile: "CL",
  brazil: "BR",
  uruguay: "UY",
  peru: "PE",
  bolivia: "BO",

  // Asia-Pacific
  australia: "AU",
  "new zealand": "NZ",
  china: "CN",
  japan: "JP",
  india: "IN",
  thailand: "TH",
  "south korea": "KR",
};

/** Every code we're willing to turn into a flag, so a stray "xx" can't become one. */
const KNOWN_ISO = new Set(Object.values(ISO_BY_NAME));

/** Strips accents, punctuation and case so "Türkiye" and "turkiye" both land. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ISO 3166-1 alpha-2 → the regional-indicator pair that renders as its flag. */
function flagFromIso(code: string): string {
  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
}

/** The flag for a country name, or null if we don't recognise it. */
export function countryFlag(country: string | null | undefined): string | null {
  const iso = countryCode(country);
  return iso ? flagFromIso(iso) : null;
}

/**
 * The ISO code as text ("FR", "NZ") — the gallery redesign sets country as a
 * typographic mark rather than an emoji flag, which fights the neutral palette.
 */
export function countryCode(country: string | null | undefined): string | null {
  if (!country) return null;

  const name = normalize(country);
  if (!name) return null;

  // A bare "IT" off a label should work too, but only if it's a code we know.
  const iso = ISO_BY_NAME[name] ?? name.toUpperCase();
  return KNOWN_ISO.has(iso) ? iso : null;
}

/**
 * "Puglia, Italy" — or just whichever half we have. A region that repeats the
 * country ("Italy, Italy", which the reader does produce) collapses to one.
 */
export function placeLine(
  region: string | null | undefined,
  country: string | null | undefined,
): string | null {
  const parts: string[] = [];
  for (const part of [region, country]) {
    const trimmed = part?.trim();
    if (!trimmed) continue;
    if (parts.some((existing) => normalize(existing) === normalize(trimmed))) continue;
    parts.push(trimmed);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}
