import Link from "next/link";
import WorldMap from "@/components/WorldMap";
import { WORLD_LAND } from "@/lib/map-geometry";
import { buildWineMap } from "@/lib/wine-map";

export const dynamic = "force-dynamic";
export const metadata = { title: "The map — Cellar Notes" };

export default async function MapPage() {
  const map = await buildWineMap();
  const bottles = map.placed + map.unplaced.length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <nav className="mb-7 flex items-center justify-between gap-4">
        <Link href="/" className="link-quiet">← All wines</Link>
        <span className="eyebrow">The map</span>
      </nav>

      <header className="mb-7">
        <h1 className="essay text-[1.875rem] leading-[1.15] text-ink">Where they came from</h1>
        <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">
          {map.placed === bottles
            ? `All ${bottles} of your bottles, on the ground they grew on.`
            : `${map.placed} of your ${bottles} bottles, on the ground they grew on.`}{" "}
          A wider, fainter circle means the label was vaguer — the bottle is somewhere in there.
        </p>
      </header>

      {map.countries.length === 0 ? (
        <p className="border-y border-rule py-8 text-center text-[0.9375rem] text-muted">
          Nothing to map yet. Log a bottle and it&apos;ll appear here.
        </p>
      ) : (
        <>
          <div className="border-y border-rule">
            <WorldMap
              land={WORLD_LAND}
              marks={map.countries.map((country) => ({
                key: country.iso,
                name: country.name,
                longitude: country.longitude,
                latitude: country.latitude,
                spread: 260,
                /* Sizes the dot and names the tooltip. The world plate never
                   opens a panel — a tap goes to the country — so this is the
                   only thing the list is for here. */
                bottles: country.regions.flatMap((region) =>
                  region.bottles.map((wine) => ({
                    id: wine.id,
                    name: wine.name,
                    producer: wine.producer,
                    score: wine.score,
                  })),
                ),
              }))}
            />
          </div>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
            Drag to move, pinch or scroll to zoom, tap a country for its regions.
          </p>

          <ul className="mt-2 divide-y divide-rule">
            {map.countries.map((country) => (
              <li key={country.iso}>
                <Link
                  href={`/map/${country.iso.toLowerCase()}`}
                  className="flex items-baseline justify-between gap-6 py-3.5"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-[0.9375rem] text-ink">{country.name}</span>
                    {/* Only worth a line when it says something the name doesn't. */}
                    {(country.regions.length > 1 || country.regions[0]?.name !== country.name) && (
                      <span className="text-[0.8125rem] leading-snug text-muted">
                        {country.regions.slice(0, 3).map((region) => region.name).join(" · ")}
                        {country.regions.length > 3 && ` · +${country.regions.length - 3} more`}
                      </span>
                    )}
                  </span>
                  <span className="eyebrow whitespace-nowrap">
                    {country.count === 1 ? "1 bottle" : `${country.count} bottles`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {map.unplaced.length > 0 && (
        <section className="mt-8 border border-rule bg-card p-5">
          <p className="eyebrow mb-2">Not on the map</p>
          <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
            {map.unplaced.length === 1 ? "One bottle has" : `${map.unplaced.length} bottles have`}{" "}
            no country recorded, so there&apos;s nowhere honest to put{" "}
            {map.unplaced.length === 1 ? "it" : "them"}: {map.unplaced.map((wine) => wine.name).join(", ")}.
            Adding a country on the edit screen is enough to place{" "}
            {map.unplaced.length === 1 ? "it" : "them"}.
          </p>
        </section>
      )}
    </main>
  );
}
