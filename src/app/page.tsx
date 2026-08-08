import Link from "next/link";
import LockButton from "@/components/LockButton";
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

  const liked = wines.filter((wine) => wine.score > 0).length;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-32 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-[2.5rem] leading-[0.95] tracking-[-0.02em] text-ink">
            Cellar
            <br />
            Notes
          </h1>
          <LockButton />
        </div>

        <hr className="rule mt-5" />

        <p className="eyebrow mt-2.5">
          {wines.length === 0
            ? "Nothing logged yet"
            : `${wines.length} bottle${wines.length === 1 ? "" : "s"} · ${liked} liked`}
        </p>
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
