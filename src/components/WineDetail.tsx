import Link from "next/link";
import LabelPhoto from "@/components/LabelPhoto";
import ServingSection from "@/components/ServingSection";
import { noteIsStale } from "@/lib/serving-note";
import DeleteWineButton from "@/components/DeleteWineButton";
import WineFactsPanel from "@/components/WineFactsPanel";
import RatingMark from "@/components/RatingMark";
import StyleMark from "@/components/StyleMark";
import { grapeSlug, styleOf } from "@/lib/grapes";
import CountryGhost from "@/components/CountryGhost";
import { countryCode, countryFlag, placeLine } from "@/lib/places";
import { placeFor } from "@/lib/wine-places";
import { tagLabel } from "@/lib/taxonomy";
import { servingFor } from "@/lib/serving";
import { wineColour } from "@/lib/wine-colours";
import type { StoredFacts } from "@/lib/wine-facts";
import type { Wine } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * One bottle, rendered the same whether it arrived as a page or as a sheet.
 *
 * `sheet` only changes what surrounds it: no "All wines" link, because the way
 * out is the sheet itself — a back link under a grab handle is two answers to
 * one question — and a smaller photo, because a sheet has less height to spend
 * than a page.
 */
export default function WineDetail({
  wine,
  stored,
  sheet = false,
}: {
  wine: Wine;
  stored: StoredFacts | null;
  sheet?: boolean;
}) {
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
            className="rounded-full border px-3.5 py-1.5 text-[0.8125rem] leading-snug
              transition-colors pointer-hover:hover:border-muted"
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
  const own = new Set([
    "vintage", "type", "grapes", "bought at", "price", "drank",
    // Stated once, below, next to what to do about it.
    "serving temperature", "serve at", "serving",
  ]);
  const looked = (stored?.details ?? []).filter(
    (detail) => !own.has(detail.label.trim().toLowerCase()),
  );

  /*
   * Two answers to the same question, and the rules are the one that's always
   * there. They're instant, they're offline, and they're right — what they
   * can't be is different, and three firm reds in a row got the same sentence
   * about a full bowl word for word. So the lookup writes a note for this
   * bottle, and it wins when it exists; before a bottle has been looked up, or
   * when the writing failed, the rules answer as they always did.
   *
   * The heading stays with the rules either way. "Serving · Nebbiolo" is
   * wayfinding, and it shouldn't wobble between two bottles of the same thing.
   */
  const statedTemperature = (stored?.details ?? []).find((detail) =>
    /^serv(ing|e)\b/i.test(detail.label.trim()),
  )?.value;
  const byRule = servingFor({
    wineType: wine.wine_type,
    grapes,
    // Producer, name and region together: how a sparkling wine was made is the
    // thing that most changes how you serve it, and it's never in the grapes.
    label: [wine.producer, wine.name, wine.region].filter(Boolean).join(" "),
    statedTemperature,
  });
  const written = stored?.serving ?? null;

  /*
   * The country behind the bottle. placeFor is the same ladder the map walks —
   * the appellation register, then whatever the lookup claimed, then the
   * middle of the country — so a bottle that shows up on the map shows up
   * here, and one that doesn't gets an outline with nothing marked on it.
   */
  const ghost = placeFor(stored?.place ?? null, wine.region, wine.country);
  const ghostIso = countryCode(wine.country) ?? countryCode(wine.region) ?? null;

  const rows: { term: string; value: React.ReactNode; found?: boolean }[] = [
    { term: "Vintage", value: wine.vintage ? String(wine.vintage) : "" },
    {
      term: "Type",
      // The glass drawn for this style on the grape index; the plain colour
      // dot only for a type that has no glass.
      value: wine.wine_type ? (
        <span className="inline-flex items-center gap-2">
          {styleOf(wine.wine_type) ? (
            <StyleMark style={styleOf(wine.wine_type)!} />
          ) : (
            accent && (
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: accent }}
              />
            )
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

  /*
   * The picture leads now. It used to be kept small because it was a snapshot
   * of a bottle on a table and the page was better spent on the verdict — but
   * the studio shot is the bottle against nothing, and at thumbnail size that
   * is simply a small bottle. A sheet still gets less than a page, because it
   * has less height to spend before the writing starts.
   */
  /*
   * Where the bottle came from, if it's known finely enough to point at. A
   * bottle placed only to its country gets the outline and no dot — a pin in
   * the middle of France says nothing except that this is France, which the
   * outline has already said.
   */
  const spot =
    ghost && ghost.precision !== "country"
      ? ([ghost.longitude, ghost.latitude] as [number, number])
      : null;

  const photo = (
    /*
     * The frame is wider than the picture and taller than it, and that space
     * is the point: it's where the country shows. Cropping it here rather than
     * letting it bleed keeps the outline inside the composition instead of
     * running under the writing below.
     */
    <div
      className="relative mx-auto flex aspect-4/5 w-full max-w-[24rem] items-center
        justify-center overflow-hidden"
    >
      <CountryGhost iso={ghostIso} at={spot} />
      <div
        className={`photo-bleed relative aspect-4/5 w-full overflow-hidden bg-tint ${
          sheet ? "max-w-[15rem]" : "max-w-[16rem]"
        }`}
      >
        <LabelPhoto
          photoId={wine.photo_id}
          alt={`Label of ${wine.name}`}
          width={sheet ? 560 : 960}
          eager
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );

  return (
    <div
      className={`mx-auto w-full max-w-3xl px-5 pb-16 ${
        sheet ? "pt-1" : "min-h-dvh"
      }`}
    >
      {sheet ? (
        /* Only Edit: getting out is the drag, and it needs no label. */
        <div className="mb-4 flex justify-end">
          <Link href={`/wine/${wine.id}/edit`} className="link-quiet">
            Edit
          </Link>
        </div>
      ) : (
        /*
          Stays put while you read. As a page this is the long one — a photo, a
          note, a table and a write-up — and swiping back is a gesture you have
          to know about. The top padding lives here rather than on the wrapper
          so the safe area is still respected once it's stuck to the top of the
          screen, and it bleeds past the page gutters so nothing scrolls up its
          sides.
        */
        <nav className="sticky top-0 z-20 -mx-5 mb-6 flex items-center justify-between gap-4
          bg-paper/92 px-5 pb-3 backdrop-blur-sm
          pt-[max(1.5rem,env(safe-area-inset-top))]">
          <Link href="/" className="link-quiet">
            ← All wines
          </Link>
          <Link href={`/wine/${wine.id}/edit`} className="link-quiet">
            Edit
          </Link>
        </nav>
      )}

      {photo}

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

      {/*
        The table closes itself top and bottom; the panel below opens with
        whitespace alone, so there's exactly one line between the two.
      */}
      <dl className="mx-auto mt-8 max-w-md divide-y divide-rule border-y border-rule">
        {rows.map((row) => (
          <div key={row.term} className="flex justify-between gap-6 py-2.5">
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

      <ServingSection
        wineId={wine.id}
        byRule={byRule}
        written={written}
        stale={noteIsStale(written)}
        mark={styleOf(wine.wine_type)}
      />

      <WineFactsPanel
        wineId={wine.id}
        initial={stored}
        query={[wine.producer, wine.name, wine.vintage].filter(Boolean).join(" ")}
      />

      <div className="mt-10 text-center">
        <DeleteWineButton id={wine.id} name={wine.name} />
      </div>
    </div>
  );
}

