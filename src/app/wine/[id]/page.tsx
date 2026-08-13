import Link from "next/link";
import { notFound } from "next/navigation";
import BottlePlaceholder from "@/components/BottlePlaceholder";
import DeleteWineButton from "@/components/DeleteWineButton";
import WineFactsPanel from "@/components/WineFactsPanel";
import RatingMark from "@/components/RatingMark";
import { grapeSlug } from "@/lib/grapes";
import { countryFlag, placeLine } from "@/lib/places";
import { tagLabel } from "@/lib/taxonomy";
import { wineColour } from "@/lib/wine-colours";
import { findFacts } from "@/lib/wine-facts";
import { getWine } from "@/lib/wines";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * What's already stored for this bottle — one row, no API call. The lookup
 * itself belongs to the client panel: a page render that can be killed halfway
 * takes the whole page down with it, which is exactly what used to happen.
 */
async function storedFacts(wineId: string) {
  try {
    return await findFacts(wineId);
  } catch (error) {
    console.error("wine: could not read stored facts:", error);
    return null;
  }
}

export default async function WinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wine = await getWine(id);
  if (!wine) notFound();

  const stored = await storedFacts(id);

  // The place has its own line under the title, so it stays out of the table.
  const place = placeLine(wine.region, wine.country);
  const flag = countryFlag(wine.country);

  // Grapes come from the log when you typed them and from the lookup when you
  // didn't — either way they're the one fact you can read further on, so they
  // render as links.
  const grapes = wine.grapes.length > 0 ? wine.grapes : (stored?.grapes ?? []);
  const grapesFound = wine.grapes.length === 0 && grapes.length > 0;

  const accent = wineColour(wine.wine_type);

  const grapeLinks =
    grapes.length > 0 ? (
      <span className="inline-flex flex-wrap justify-end gap-1.5">
        {grapes.map((grape) => (
          <Link
            key={grape}
            href={`/grape/${grapeSlug(grape)}`}
            className="rounded-full border px-3 py-1 text-[0.8125rem] leading-snug
              transition-colors hover:border-muted"
            style={
              accent
                ? {
                    borderColor: `color-mix(in oklab, ${accent} 30%, transparent)`,
                    backgroundColor: `color-mix(in oklab, ${accent} 7%, var(--color-card))`,
                  }
                : undefined
            }
          >
            {grape}
          </Link>
        ))}
      </span>
    ) : (
      ""
    );

  /**
   * One table, whether a value came from you or from the search. What was found
   * rather than entered sits in the softer ink — quietly, without a footnote,
   * but the distinction is still there to be noticed.
   */
  const own = new Set(["vintage", "type", "grapes", "bought at", "price", "drank"]);
  const looked = (stored?.details ?? []).filter(
    (detail) => !own.has(detail.label.trim().toLowerCase()),
  );

  const rows: { term: string; value: React.ReactNode; found?: boolean }[] = [
    { term: "Vintage", value: wine.vintage ? String(wine.vintage) : "" },
    {
      term: "Type",
      value: wine.wine_type ? (
        <span className="inline-flex items-center gap-2">
          {accent && (
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: accent }}
            />
          )}
          {wine.wine_type}
        </span>
      ) : (
        ""
      ),
    },
    { term: "Grapes", value: grapeLinks, found: grapesFound },
    ...looked.map((detail) => ({ term: detail.label, value: detail.value, found: true })),
    { term: "Bought at", value: wine.source ?? "" },
    { term: "Price", value: wine.price_eur !== null ? `€${wine.price_eur.toFixed(2)}` : "" },
    { term: "Drank", value: formatDate(wine.drank_on) },
  ].filter((row) => row.value !== "");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <nav className="mb-6 flex items-center justify-between">
        <Link href="/" className="link-quiet">
          ← All wines
        </Link>
        <Link href={`/wine/${wine.id}/edit`} className="link-quiet">
          Edit
        </Link>
      </nav>

      <div className="mx-auto aspect-4/5 w-full max-w-[14rem] overflow-hidden bg-tint">
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
      <header className="mt-6 text-center">
        {wine.producer && <p className="eyebrow">{wine.producer}</p>}
        <h1 className="essay mt-2 text-[1.75rem] leading-[1.2] text-ink">
          {wine.name}
        </h1>
        {place && (
          <p className="mt-2 flex items-baseline justify-center gap-2 text-[0.9375rem] text-ink-soft">
            {flag && (
              <span aria-hidden="true" className="text-[1.0625rem] leading-none">
                {flag}
              </span>
            )}
            <span>{place}</span>
          </p>
        )}
        <div className="mt-4 flex justify-center">
          <RatingMark score={wine.score} size="lg" />
        </div>
      </header>

      {wine.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {wine.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-rule bg-card px-3.5 py-1.5
                text-[0.8125rem] text-ink-soft"
            >
              {tagLabel(tag)}
            </span>
          ))}
        </div>
      )}

      {wine.notes && (
        <blockquote className="mx-auto mt-8 max-w-md border-t border-rule pt-6 text-center">
          <p className="essay text-[1.25rem] leading-[1.45] text-ink">{wine.notes}</p>
        </blockquote>
      )}

      <dl className="mx-auto mt-8 max-w-md border-t border-rule">
        {rows.map((row) => (
          <div key={row.term} className="flex justify-between gap-6 border-b border-rule py-2.5">
            <dt className="eyebrow pt-0.5">{row.term}</dt>
            <dd
              className={`text-right text-[0.9375rem] tabular-nums ${
                row.found ? "text-ink-soft" : "text-ink"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <WineFactsPanel
        wineId={wine.id}
        initial={stored}
        query={[wine.producer, wine.name, wine.vintage].filter(Boolean).join(" ")}
      />

      <div className="mt-10 text-center">
        <DeleteWineButton id={wine.id} name={wine.name} />
      </div>
    </main>
  );
}
