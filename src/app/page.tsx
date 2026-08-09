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

  const count = wines.length;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-28 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="mb-5">
        {/* Scales with the viewport so it stays on one line down to a 320px phone. */}
        <h1 className="masthead whitespace-nowrap text-[clamp(1.75rem,9vw,2.25rem)]
          leading-none text-ink">
          Cellar Notes
        </h1>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <span className="eyebrow" style={{ fontVariantNumeric: "tabular-nums" }}>
            {count > 0
              ? `The collection · ${count} ${count === 1 ? "bottle" : "bottles"}`
              : "The collection"}
          </span>
          <Link href="/grapes" className="link-quiet">
            Grapes
          </Link>
        </div>
      </header>

      {loadError ? (
        <p className="border border-rule bg-card p-5 text-[0.9375rem] text-wine">
          {loadError}
        </p>
      ) : (
        <WineList wines={wines} />
      )}

      {/* The register: one ink bar across the bottom, always under the thumb. */}
      <div className="fixed inset-x-0 bottom-0">
        <Link
          href="/add"
          className="flex w-full items-center justify-center gap-2 bg-ink py-4
            pb-[max(1rem,env(safe-area-inset-bottom))] text-[0.75rem] font-medium
            uppercase tracking-[0.16em] text-paper transition active:opacity-90"
        >
          Log a wine
        </Link>
      </div>
    </main>
  );
}
