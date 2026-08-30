import { placeFor, SPREAD_KM, type Placement } from "@/lib/wine-places";
import { countryCode, countryName } from "@/lib/places";
import { storedPlaces } from "@/lib/wine-facts";
import { listWines } from "@/lib/wines";
import type { Wine } from "@/lib/types";

/**
 * The log, arranged by where it came from.
 *
 * Everything with a readable country is on the map; what varies is how tightly.
 * A bottle whose label named an appellation sits on that appellation, and one
 * that said only "Italy" sits in the middle of Italy with a wide halo — the
 * halo being the honest part, since it says "somewhere in here" rather than
 * pretending to a hillside.
 *
 * Bottles are grouped by the narrowest place they resolved to, so a country-level
 * bottle forms its own cluster rather than being folded into a region it may
 * have nothing to do with.
 */

export type MapBottle = { wine: Wine; place: Placement };

export type MapRegion = {
  key: string;
  name: string;
  longitude: number;
  latitude: number;
  precision: Placement["precision"];
  /** Roughly how far out the truth could be, in kilometres. */
  spread: number;
  bottles: Wine[];
  /** The step above this one, when the lookup gave a hierarchy. */
  parent: string | null;
};

export type MapCountry = {
  iso: string;
  name: string;
  longitude: number;
  latitude: number;
  count: number;
  regions: MapRegion[];
};

export type WineMap = {
  countries: MapCountry[];
  placed: number;
  /** Bottles with nothing readable at all — no country, so nowhere to put them. */
  unplaced: Wine[];
};

/** A stable key, so the same region from two bottles is one mark. */
function regionKey(iso: string, place: Placement): string {
  const last = place.path[place.path.length - 1] ?? iso;
  return `${iso}:${last.toLowerCase()}`;
}

export async function buildWineMap(): Promise<WineMap> {
  const [wines, places] = await Promise.all([listWines(), storedPlaces().catch(() => new Map())]);

  const countries = new Map<string, MapCountry>();
  const unplaced: Wine[] = [];
  let placed = 0;

  for (const wine of wines) {
    const place = placeFor(places.get(wine.id) ?? null, wine.region, wine.country);
    const iso = countryCode(wine.country) ?? countryCode(wine.region);

    if (!place || !iso) {
      unplaced.push(wine);
      continue;
    }
    placed += 1;

    let country = countries.get(iso);
    if (!country) {
      country = {
        iso,
        /*
         * From the code, not from place.path[0]. When the register places a
         * bottle and the lookup gave no hierarchy, the path is just the
         * appellation — and Portugal was appearing on the map as "Vinho Verde".
         */
        name: countryName(iso) ?? wine.country?.trim() ?? iso,
        longitude: place.longitude,
        latitude: place.latitude,
        count: 0,
        regions: [],
      };
      countries.set(iso, country);
    }
    country.count += 1;

    const key = regionKey(iso, place);
    let region = country.regions.find((entry) => entry.key === key);
    if (!region) {
      const name = place.path[place.path.length - 1] ?? country.name;
      region = {
        key,
        name,
        longitude: place.longitude,
        latitude: place.latitude,
        precision: place.precision,
        spread: SPREAD_KM[place.precision],
        bottles: [],
        parent: place.path.length > 1 ? place.path[place.path.length - 2] : null,
      };
      country.regions.push(region);
    }
    region.bottles.push(wine);
  }

  for (const country of countries.values()) {
    country.regions.sort((a, b) => b.bottles.length - a.bottles.length || a.name.localeCompare(b.name));
    // The country's own mark sits on its busiest region, so the world view
    // points at where the wine is rather than at a political centre.
    const busiest = country.regions[0];
    if (busiest) {
      country.longitude = busiest.longitude;
      country.latitude = busiest.latitude;
    }
  }

  return {
    countries: [...countries.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    placed,
    unplaced,
  };
}

export function findCountry(map: WineMap, iso: string): MapCountry | null {
  return map.countries.find((country) => country.iso === iso.toUpperCase()) ?? null;
}
