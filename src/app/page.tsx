import Link from "next/link";
import { Suspense } from "react";
import CollectionSkeleton from "@/components/CollectionSkeleton";
import WineList from "@/components/WineList";
import { listWines } from "@/lib/wines";
import type { Wine } from "@/lib/types";

export const dynamic = "force-dynamic";

type Loaded = { wines: Wine[]; error: string | null };

/**
 * Never rejects, so both readers below can await it without a second try/catch
 * between them.
 */
function loadWines(): Promise<Loaded> {
  return listWines()
    .then((wines) => ({ wines, error: null }))
    .catch((error: unknown) => {
      console.error("home: could not load wines:", error);
      return {
        wines: [] as Wine[],
        error:
          "Couldn't reach the database. Check DATABASE_URL, and that you've run `npm run db:init`.",
      };
    });
}

async function Count({ loaded }: { loaded: Promise<Loaded> }) {
  const { wines } = await loaded;
  const count = wines.length;

  return (
    <span className="eyebrow" style={{ fontVariantNumeric: "tabular-nums" }}>
      {count > 0
        ? `The collection · ${count} ${count === 1 ? "bottle" : "bottles"}`
        : "The collection"}
    </span>
  );
}

async function Collection({ loaded }: { loaded: Promise<Loaded> }) {
  const { wines, error } = await loaded;

  if (error) {
    return (
      <p className="border border-rule bg-card p-5 text-[0.9375rem] text-wine">{error}</p>
    );
  }

  return <WineList wines={wines} />;
}

export default function HomePage() {
  /*
   * Started, not awaited. The masthead and the nav owe the database nothing, so
   * they go out with the first flush and the browser has something to paint
   * while the query runs — the whole document used to wait on this one call,
   * which is what made the app open on a white screen and then appear all at
   * once. Both readers share the one promise, so it's still one query.
   */
  const loaded = loadWines();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-32 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="mb-5">
        {/* Scales with the viewport so it stays on one line down to a 320px phone. */}
        <h1 className="masthead whitespace-nowrap text-[clamp(1.75rem,9vw,2.25rem)]
          leading-none text-ink">
          Cellar Notes
        </h1>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <Suspense fallback={<span className="eyebrow">The collection</span>}>
            <Count loaded={loaded} />
          </Suspense>
          <nav className="flex shrink-0 items-baseline gap-4">
            <Link href="/grapes" className="link-quiet">
              Grapes
            </Link>
            <Link href="/labels" className="link-quiet">
              Labels
            </Link>
          </nav>
        </div>
      </header>

      <Suspense fallback={<CollectionSkeleton />}>
        <Collection loaded={loaded} />
      </Suspense>

      {/*
        A soft paper fade so the button never sits awkwardly on a photo.

        z-40 says out loud what used to be true only by accident: the cards
        became positioned elements when their photos started fading into the
        page, and until now this floated purely because it happens to come
        after them in the markup. It sits under the sheet at z-50.
        The midpoint sits low and stops well short of opaque: a band of solid
        paper across the bottom of the grid reads as a panel the page is sitting
        under, rather than as the page quietly running out. The button is solid
        on its own account, so the fade owes it nothing.
      */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center
        bg-gradient-to-t from-paper/80 from-0% via-paper/40 via-30% to-transparent to-100%
        pt-9 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {/* The one rounded control in the app: it floats over the grid rather
            than sitting in it, and a square block here reads as another tile. */}
        <Link href="/add" className="btn-ink pointer-events-auto rounded-full px-8">
          Log a wine
        </Link>
      </div>
    </main>
  );
}
