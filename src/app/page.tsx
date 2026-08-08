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

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-ink">
            Cellar Notes
          </h1>
          <p className="mt-1 text-sm text-muted">
            {wines.length === 0
              ? "Nothing logged yet."
              : `${wines.length} bottle${wines.length === 1 ? "" : "s"} logged.`}
          </p>
        </div>
        <LockButton />
      </header>

      {loadError ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-wine-soft">
          {loadError}
        </p>
      ) : (
        <WineList wines={wines} />
      )}

      <Link
        href="/add"
        className="btn-primary fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))]
          mx-auto max-w-md shadow-lg shadow-black/40"
      >
        <span aria-hidden>＋</span> Log a wine
      </Link>
    </main>
  );
}
