import Link from "next/link";
import WineList from "@/components/WineList";
import { listWines } from "@/lib/wines";
import type { Wine } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let wines: Wine[] = [];
  let loadError: string | null = null;

  try {
    wines = await listWines();
  } catch (error) {
    console.error("home: could not load wines:", error);
    loadError =
      "Couldn't reach the database. Check DATABASE_URL, and that you've run `npm run db:init`.";
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-32 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <header className="mb-6">
        {/* Scales with the viewport so it stays on one line down to a 320px phone. */}
        <h1 className="serif-display whitespace-nowrap text-[clamp(1.75rem,11vw,2.5rem)]
          leading-none tracking-[-0.02em] text-ink">
          Cellar Notes
        </h1>
        {/* Its own line rather than beside the masthead, which is already
            edge-to-edge on a small phone. */}
        <div className="mt-4 flex items-baseline justify-between gap-4">
          <span className="eyebrow">Your log</span>
          <nav className="flex shrink-0 items-baseline gap-4">
            <Link href="/grapes" className="link-quiet">
              Grapes
            </Link>
            <Link href="/labels" className="link-quiet">
              Labels
            </Link>
          </nav>
        </div>
        <hr className="rule mt-4" />
      </header>

      {loadError ? (
        <p className="border border-rule bg-card p-5 text-[0.9375rem] text-wine">
          {loadError}
        </p>
      ) : (
        <WineList wines={wines} />
      )}

      {/* A soft paper fade so the button never sits awkwardly on a photo. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center
        bg-gradient-to-t from-paper via-paper/90 to-transparent pt-12
        pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Link href="/add" className="btn-ink pointer-events-auto px-8">
          Log a wine
        </Link>
      </div>
    </main>
  );
}
