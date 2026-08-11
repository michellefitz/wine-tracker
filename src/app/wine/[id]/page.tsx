import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BottlePlaceholder from "@/components/BottlePlaceholder";
import DeleteWineButton from "@/components/DeleteWineButton";
import WineFactsView from "@/components/WineFactsView";
import RatingMark from "@/components/RatingMark";
import { grapeSlug } from "@/lib/grapes";
import { countryFlag, placeLine } from "@/lib/places";
import { tagLabel } from "@/lib/taxonomy";
import { getWineFacts } from "@/lib/wine-facts";
import { getWine } from "@/lib/wines";

export const dynamic = "force-dynamic";

/**
 * The first view of a bottle searches the web for it, which runs past Vercel's
 * default function budget. Every view after that is a single row.
 */
export const maxDuration = 60;

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Mirrors the real section so the page doesn't jump when the lookup lands. */
function FactsOutline() {
  return (
    <section className="mx-auto mt-12 max-w-md animate-pulse border-t border-rule pt-7">
      <p className="eyebrow mb-5">About this bottle</p>
      <div className="space-y-2.5">
        <span className="block h-3.5 w-full bg-tint" />
        <span className="block h-3.5 w-full bg-tint" />
        <span className="block h-3.5 w-2/5 bg-tint" />
      </div>
    </section>
  );
}

/**
 * Kept out of the page body so the bottle, your rating and your note render
 * immediately — the lookup streams in underneath when it's ready.
 */
async function WineFacts({ wineId }: { wineId: string }) {
  const wine = await getWine(wineId);
  if (!wine) return null;

  const lookup = await getWineFacts(wine);
  if (lookup.status === "unavailable") {
    return (
      <section className="mx-auto mt-12 max-w-md border-t border-rule pt-7">
        <p className="eyebrow mb-4">About this bottle</p>
        <p className="text-[0.9375rem] leading-relaxed text-muted">{lookup.message}</p>
      </section>
    );
  }

  return <WineFactsView wineId={wineId} facts={lookup.facts} warning={lookup.warning} />;
}

export default async function WinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wine = await getWine(id);
  if (!wine) notFound();

  // The place has its own line under the title, so it stays out of the table.
  const place = placeLine(wine.region, wine.country);
  const flag = countryFlag(wine.country);

  // Grapes are the one fact you can read further on, so they're rendered as
  // links rather than text — everything else on this list is just your entry.
  const facts: [string, React.ReactNode][] = [
    ["Vintage", wine.vintage ? String(wine.vintage) : ""],
    ["Type", wine.wine_type ?? ""],
    [
      "Grapes",
      wine.grapes.length > 0 ? (
        <span className="inline-flex flex-wrap justify-end gap-x-1.5 gap-y-1">
          {wine.grapes.map((grape, index) => (
            <span key={grape}>
              <Link
                href={`/grape/${grapeSlug(grape)}`}
                className="underline decoration-rule underline-offset-4 transition-colors
                  hover:decoration-ink"
              >
                {grape}
              </Link>
              {index < wine.grapes.length - 1 && ","}
            </span>
          ))}
        </span>
      ) : (
        ""
      ),
    ],
    ["Bought at", wine.source ?? ""],
    ["Price", wine.price_eur !== null ? `€${wine.price_eur.toFixed(2)}` : ""],
    ["Drank", formatDate(wine.drank_on)],
  ].filter(([, value]) => value !== "") as [string, React.ReactNode][];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-20 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <nav className="mb-8 flex items-center justify-between">
        <Link href="/" className="link-quiet">
          ← All wines
        </Link>
        <Link href={`/wine/${wine.id}/edit`} className="link-quiet">
          Edit
        </Link>
      </nav>

      <div className="mx-auto aspect-4/5 w-full max-w-xs overflow-hidden bg-tint">
        {wine.photo_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${wine.photo_id}?w=960`}
            alt={`Label of ${wine.name}`}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <BottlePlaceholder />
        )}
      </div>

      {/* The wall label: producer, work, place, verdict. */}
      <header className="mt-9 text-center">
        {wine.producer && <p className="eyebrow">{wine.producer}</p>}
        <h1 className="essay mt-3 text-[1.875rem] leading-[1.2] text-ink">
          {wine.name}
        </h1>
        {place && (
          <p className="mt-2.5 flex items-baseline justify-center gap-2 text-[0.9375rem] text-ink-soft">
            {flag && (
              <span aria-hidden="true" className="text-[1.0625rem] leading-none">
                {flag}
              </span>
            )}
            <span>{place}</span>
          </p>
        )}
        <div className="mt-5 flex justify-center">
          <RatingMark score={wine.score} size="lg" />
        </div>
      </header>

      {wine.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-1.5">
          {wine.tags.map((tag) => (
            <span
              key={tag}
              className="border border-rule px-3 py-1 text-[0.8125rem] text-ink-soft"
            >
              {tagLabel(tag)}
            </span>
          ))}
        </div>
      )}

      {wine.notes && (
        <blockquote className="mx-auto mt-10 max-w-md border-t border-rule pt-8 text-center">
          <p className="essay text-[1.375rem] leading-[1.5] text-ink">{wine.notes}</p>
        </blockquote>
      )}

      <dl className="mx-auto mt-11 max-w-md border-t border-rule">
        {facts.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-6 border-b border-rule py-3.5">
            <dt className="eyebrow pt-0.5">{term}</dt>
            <dd className="text-right text-[0.9375rem] tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {wine.grapes.length > 0 && (
        <p className="mx-auto mt-3 max-w-md text-[0.8125rem] text-muted">
          Tap a grape to read what it&apos;s like and where it grows.
        </p>
      )}

      <Suspense fallback={<FactsOutline />}>
        <WineFacts wineId={wine.id} />
      </Suspense>

      <div className="mt-14 text-center">
        <DeleteWineButton id={wine.id} name={wine.name} />
      </div>
    </main>
  );
}
