import Link from "next/link";
import { notFound } from "next/navigation";
import MapPlate from "@/components/MapPlate";
import RatingMark from "@/components/RatingMark";
import { COUNTRY_SHAPES } from "@/lib/map-geometry";
import { buildWineMap, findCountry } from "@/lib/wine-map";

export const dynamic = "force-dynamic";

const PRECISION_NOTE: Record<string, string> = {
  appellation: "a named appellation",
  subregion: "a district",
  region: "a whole region",
  country: "somewhere in the country — the label named no region",
};

export default async function MapCountryPage({ params }: { params: Promise<{ iso: string }> }) {
  const { iso } = await params;
  const map = await buildWineMap();
  const country = findCountry(map, iso);
  if (!country) notFound();

  const land = COUNTRY_SHAPES[country.iso];

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

      {land && (
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
      )}

      <div className="mt-8 flex flex-col gap-9">
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
