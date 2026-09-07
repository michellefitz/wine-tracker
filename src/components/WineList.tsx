"use client";

import { useEffect, useMemo, useState } from "react";
import WineCard from "@/components/WineCard";
import WineRolodex from "@/components/WineRolodex";
import { ratingFor, tagLabel } from "@/lib/taxonomy";
import type { Wine } from "@/lib/types";

type View = "grid" | "gallery";

/**
 * Folded down to something a phone keyboard can actually produce.
 *
 * Lower case was never enough here. This is a log of López, Viña, Château,
 * Grüner and Rhône, and nobody long-presses a vowel to find their own Rioja —
 * so "lopez" found nothing and "López" found the bottle, which is a search box
 * that works only if you already know how to spell what you're looking for.
 * Decomposing and dropping the combining marks means the accent is optional in
 * the query and preserved everywhere it is actually read.
 */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Everything a search box should reasonably match on. */
function haystack(wine: Wine): string {
  return fold(
    [
      wine.name,
      wine.producer,
      wine.region,
      wine.country,
      wine.wine_type,
      wine.source,
      wine.notes,
      wine.vintage,
      ...wine.grapes,
      /*
       * ...and the words the cards themselves are showing.
       *
       * "Loved" and "Unopened" are printed on the bottle in front of you, and
       * typing either of them used to return "Nothing matches that", which
       * reads as the app denying something you can see. Until there is a
       * proper filter this is also the only way to ask what is still in the
       * house, so it earns its place twice over.
       */
      ratingFor(wine.score)?.label,
      ratingFor(wine.score)?.short,
      ...wine.tags.map(tagLabel),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={active ? "text-ink" : "text-muted"}
    >
      <rect x="1" y="1" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Three tall panes side by side, not two wide bars.
 *
 * The old glyph was a pair of full-width rows, which is the universal symbol
 * for a list — so the button that produces the shelf of bottles looked like
 * the one that would produce a list of names, and the button that produces a
 * list of names looked like a grid. Both testers reached for the wrong one.
 * Upright panes read as bottles on a shelf, which is what is behind it.
 */
function ShelfIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={active ? "text-ink" : "text-muted"}
    >
      <rect x="1" y="2" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="2" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="2" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Which view you last chose, kept between visits.
 *
 * Not the default — that stays the shelf — but a choice that survives nothing
 * at all is not a choice. Picking the named list and finding the shelf back
 * again on every single reload was the most repeated complaint in the study.
 *
 * Read after mount rather than during render: the server has no localStorage,
 * so consulting it while rendering makes the first client render disagree with
 * the HTML that arrived, which React reports as a hydration error.
 */
const REMEMBERED = "cellar-view";

export default function WineList({ wines }: { wines: Wine[] }) {
  const [view, setView] = useState<View>("gallery");
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const kept = window.localStorage.getItem(REMEMBERED);
      if (kept === "grid" || kept === "gallery") setView(kept);
    } catch {
      // Private windows and blocked site data throw on access alone.
    }
  }, []);

  function choose(next: View) {
    setView(next);
    try {
      window.localStorage.setItem(REMEMBERED, next);
    } catch {
      // Then it just doesn't remember; the view still changes.
    }
  }

  const visible = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return wines;
    return wines.filter((wine) => haystack(wine).includes(needle));
  }, [wines, query]);

  if (wines.length === 0) {
    return (
      <div className="border-t border-rule py-20 text-center">
        <p className="mx-auto max-w-xs essay text-[1.5rem] leading-snug text-ink">
          Start with the last bottle you opened.
        </p>
        <p className="mx-auto mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-muted">
          Photograph the label, say whether you liked it, and it&apos;s No. 1 in the
          collection. The shelf gets much easier after a dozen of these.
        </p>
      </div>
    );
  }

  const searching = query.trim().length > 0;

  return (
    <div>
      <div className="mb-5 flex items-end gap-3">
        <input
          type="search"
          className="flex-1 bg-transparent py-2.5 text-[0.9375rem] text-ink
            outline-none placeholder:text-muted/60"
          placeholder="Search name, grape, region, note…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {/*
          Ours, since WebKit's is hidden. Only while there's something to
          clear, so the row isn't carrying a dead button most of the time.
        */}
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="mb-2.5 shrink-0 px-2 py-1 text-muted transition-colors hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        )}
        <div className="flex gap-1 pb-2.5">
          {/*
            The chosen one is on a tint, not merely a darker grey. The colour
            difference alone was invisible to both testers, so neither could
            tell which view they were in or that the first tap had done
            anything — one of them tapped the view he was already looking at
            and concluded the button was broken.
          */}
          <button
            type="button"
            onClick={() => choose("grid")}
            aria-label="List with names"
            aria-pressed={view === "grid"}
            className={`rounded p-1.5 transition-colors ${
              view === "grid" ? "bg-tint" : ""
            }`}
          >
            <GridIcon active={view === "grid"} />
          </button>
          <button
            type="button"
            onClick={() => choose("gallery")}
            aria-label="Shelf of bottles"
            aria-pressed={view === "gallery"}
            className={`rounded p-1.5 transition-colors ${
              view === "gallery" ? "bg-tint" : ""
            }`}
          >
            <ShelfIcon active={view === "gallery"} />
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="border-t border-rule py-16 text-center text-[0.9375rem] text-muted">
          Nothing matches that.
        </p>
      ) : view === "gallery" && !searching ? (
        <WineRolodex wines={visible} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10">
          {visible.map((wine) => (
            <li key={wine.id}>
              <WineCard wine={wine} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
