import { COUNTRY_BOUNDS } from "@/lib/country-bounds";
import { countryCode } from "@/lib/places";
import { findRegion } from "@/lib/wine-regions";

/**
 * Putting a bottle somewhere on the map — always somewhere.
 *
 * A map with a "couldn't place this one" pile teaches you nothing about the
 * pile. So this is a ladder rather than a lookup: the lookup's own coordinate
 * if it gave one and it survives checking, then the country's wine centre, and
 * only a bottle with no readable country at all falls off the end. What varies
 * is not whether it lands but how precisely, and the map is expected to show
 * that difference rather than hide it — a tight point for an appellation, a
 * soft wide halo for "somewhere in Portugal".
 *
 * The checking matters more than the fallback. Measured against twenty real
 * appellations, geocoding the region name openly is confidently wrong about a
 * quarter of the time: unconstrained, "Langhe" resolves to Hubei and "Chianti
 * Classico" to Lower Saxony; even constrained to the right country, "Barossa
 * Valley" comes back 550 km away in Victoria. A coordinate that is wrong is
 * worse than one that is vague, because a vague one reads as vague and a wrong
 * one teaches you something false. Everything here therefore has to fall inside
 * the country the label claims, or it is thrown away for the country centre.
 */

/** How much of the world a placement actually pins down. */
export type Precision = "appellation" | "subregion" | "region" | "country";

export type Placement = {
  longitude: number;
  latitude: number;
  precision: Precision;
  /** Country first, narrowing: ["Italy", "Piemonte", "Langhe", "Barolo"]. */
  path: string[];
  /** Plain English for why it sits where it sits, for the map to show. */
  note: string;
};

/** What the lookup claimed, before any of it is believed. */
export type ClaimedPlace = {
  path?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  precision?: unknown;
};

const PRECISIONS = new Set<Precision>(["appellation", "subregion", "region", "country"]);

/** Roughly how far off a placement could be, for drawing the halo. */
export const SPREAD_KM: Record<Precision, number> = {
  appellation: 12,
  subregion: 35,
  region: 90,
  country: 400,
};

function inside(box: [number, number, number, number], lon: number, lat: number): boolean {
  const [w, s, e, n] = box;
  // A degree of slack: a coastal appellation's centre can sit just outside a
  // simplified outline, and a real one being nudged is better than it being lost.
  return lon >= w - 1 && lon <= e + 1 && lat >= s - 1 && lat <= n + 1;
}

function cleanPath(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen: string[] = [];
  for (const part of value) {
    if (typeof part !== "string") continue;
    const text = part.trim().slice(0, 60);
    if (!text) continue;
    if (seen.some((existing) => existing.toLowerCase() === text.toLowerCase())) continue;
    seen.push(text);
    if (seen.length === 5) break;
  }
  return seen;
}

/**
 * Where this bottle goes.
 *
 * `claimed` is whatever the lookup returned, entirely untrusted. `region` and
 * `country` are the free-text fields off the bottle itself, which are what the
 * fallback leans on when the lookup gave nothing usable.
 */
export function placeFor(
  claimed: ClaimedPlace | null | undefined,
  region: string | null | undefined,
  country: string | null | undefined,
): Placement | null {
  const iso = countryCode(country) ?? countryCode(region);
  const bounds = iso ? COUNTRY_BOUNDS[iso] : undefined;

  /*
   * The register first, because it is a lookup and everything below it is a
   * recollection. If the label names a European appellation, its real centre
   * beats whatever the model remembered — and beats it silently, without
   * needing to be checked against a country box.
   *
   * The path is taken from the lookup when it agrees, since the register knows
   * where Barolo is but not that Barolo sits inside Piemonte.
   */
  const named = findRegion(region, iso) ?? findRegion(cleanPath(claimed?.path).at(-1), iso);
  if (named) {
    const claimedPath = cleanPath(claimed?.path);
    const path = claimedPath.some((step) => step.toLowerCase() === named.name.toLowerCase())
      ? claimedPath
      : [...claimedPath, named.name];
    return {
      longitude: named.longitude,
      latitude: named.latitude,
      precision: "appellation",
      path,
      note: `Placed in ${named.name}, from the European register of appellations.`,
    };
  }

  const path = cleanPath(claimed?.path);
  // Numbers, not things that merely convert to numbers: Number("44.6") is
  // finite, and a coordinate arriving as a string means the shape is wrong.
  const lon = typeof claimed?.longitude === "number" ? claimed.longitude : NaN;
  const lat = typeof claimed?.latitude === "number" ? claimed.latitude : NaN;
  const precision = claimed?.precision as Precision;

  const usable =
    Number.isFinite(lon) && Number.isFinite(lat) &&
    lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90 &&
    !(lon === 0 && lat === 0) &&                       // null island, not a vineyard
    PRECISIONS.has(precision);

  if (usable && (!bounds || inside(bounds.box, lon, lat))) {
    const named = path.length > 0 ? path[path.length - 1] : null;
    return {
      longitude: lon,
      latitude: lat,
      precision,
      path,
      note:
        precision === "country"
          ? `Placed in the middle of ${named ?? "the country"} — the label didn't name a region.`
          : `Placed in ${named ?? "this region"}.`,
    };
  }

  if (!bounds) return null;

  const name = path[0] ?? country?.trim() ?? iso!;
  return {
    longitude: bounds.centre[0],
    latitude: bounds.centre[1],
    precision: "country",
    path: [name],
    note: usable
      ? `Placed in the middle of ${name}: the region we found for this bottle didn't sit inside ${name}, so it wasn't trusted.`
      : `Placed in the middle of ${name} — nothing on the bottle or in the lookup named a region.`,
  };
}
