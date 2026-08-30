import Link from "next/link";
import { notFound } from "next/navigation";
import CountryMap from "@/components/CountryMap";
import MapPlate from "@/components/MapPlate";
import RatingMark from "@/components/RatingMark";
import type { PlateMark, PlateRegion } from "@/components/RegionMap";
import { COUNTRY_SHAPES } from "@/lib/map-geometry";
import { shapesFor } from "@/lib/region-shapes";
import { flattenLoose } from "@/lib/text";
import { buildWineMap, findCountry } from "@/lib/wine-map";
import type { Wine } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRECISION_NOTE: Record<string, string> = {
  appellation: "a named appellation",
  subregion: "a district",
  region: "a whole region",
  country: "somewhere in the country — the label named no region",
};

function bottleOf(wine: Wine) {
  return { id: wine.id, name: wine.name, producer: wine.producer, score: wine.score };
}

export default async function MapCountryPage({ params }: { params: Promise<{ iso: string }> }) {
  const { iso } = await params;
  const map = await buildWineMap();
  const country = findCountry(map, iso);
  if (!country) notFound();

  const land = COUNTRY_SHAPES[country.iso];

  /*
   * The appellations of this country, if the EU registers any — nothing at all
   * for Argentina or Australia, which is not a failure so much as the limit of
   * the only open boundary set there is. Those countries fall through to the
   * plate below, which has always drawn dots on a coastline.
   */
  const shapes = await shapesFor(country.iso);

  /*
   * Yours, matched onto the register's own names. Two flattened strings either
   * side of the same match: the region name the lookup gave, and the name the
   * EU registers. Anything that doesn't match stays a dot.
   */
  const byKey = new Map(country.regions.map((region) => [flattenLoose(region.name), region]));
  const matched = new Set<string>();

  const regions: PlateRegion[] = shapes.map((shape) => {
    const mine = byKey.get(shape.key);
    if (mine) matched.add(mine.key);
    return {
      key: shape.key,
      name: shape.name,
      rings: shape.rings,
      bottles: (mine?.bottles ?? []).map(bottleOf),
    };
  });

  const marks: PlateMark[] = country.regions
    .filter((region) => !matched.has(region.key))
    .map((region) => ({
      key: region.key,
      name: region.name,
      longitude: region.longitude,
      latitude: region.latitude,
      spread: region.spread,
      bottles: region.bottles.map(bottleOf),
    }));

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <nav className="mb-7 flex items-center justify-between gap-4">
        <Link href="/map" className="link-quiet">← The map</Link>
        <span className="eyebrow">{country.name}</span>
      </nav>

      <header className="mb-7">
        <h1 className="essay text-[1.875rem] leading-[1.15] text-ink">{country.name}</h1>
        <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">
          {country.count === 1 ? "One bottle" : `${country.count} bottles`} from{" "}
          {country.regions.length === 1 ? "one place" : `${country.regions.length} places`}.
        </p>
      </header>

      {land && shapes.length > 0 ? (
        <CountryMap land={land} regions={regions} marks={marks} countryName={country.name} />
      ) : (
        land && (
          <div className="border-y border-rule py-4">
            <MapPlate
              detailed
              width={340}
              height={330}
              land={land}
              marks={country.regions.map((region) => ({
                key: region.key,
                longitude: region.longitude,
                latitude: region.latitude,
                count: region.bottles.length,
                spread: region.spread,
                label: region.precision === "country" ? null : region.name,
                href: `#${encodeURIComponent(region.key)}`,
              }))}
            />
          </div>
        )
      )}

      <div className="mt-10 flex flex-col gap-9">
        {country.regions.map((region) => (
          <section key={region.key} id={region.key} className="scroll-mt-6">
            <div className="flex items-baseline justify-between gap-5 border-b border-rule pb-2.5">
              <h2 className="essay text-[1.375rem] leading-tight text-ink">{region.name}</h2>
              <span className="eyebrow whitespace-nowrap">
                {region.bottles.length === 1 ? "1 bottle" : `${region.bottles.length} bottles`}
              </span>
            </div>

            <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-muted">
              {region.parent && <span className="text-ink-soft">In {region.parent}. </span>}
              Placed to {PRECISION_NOTE[region.precision]}.
            </p>

            <ul className="mt-3 divide-y divide-rule">
              {region.bottles.map((wine) => (
                <li key={wine.id}>
                  <Link href={`/wine/${wine.id}`} className="flex items-baseline justify-between gap-6 py-3">
                    <span className="flex flex-col gap-1">
                      <span className="essay text-[1.0625rem] text-ink">{wine.name}</span>
                      {wine.producer && (
                        <span className="text-[0.8125rem] text-muted">{wine.producer}</span>
                      )}
                    </span>
                    <RatingMark score={wine.score} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
