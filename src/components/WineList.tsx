"use client";

import { useMemo, useState } from "react";
import WineCard from "@/components/WineCard";
import WineRolodex from "@/components/WineRolodex";
import type { Wine } from "@/lib/types";

type View = "grid" | "gallery";

/** Everything a search box should reasonably match on. */
function haystack(wine: Wine): string {
  return [
    wine.name,
    wine.producer,
    wine.region,
    wine.country,
    wine.wine_type,
    wine.source,
    wine.notes,
    wine.vintage,
    ...wine.grapes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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

function GalleryIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={active ? "text-ink" : "text-muted"}
    >
      <rect x="1" y="3" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function WineList({ wines }: { wines: Wine[] }) {
  const [view, setView] = useState<View>("gallery");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
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
          className="field flex-1 text-[0.9375rem]"
          placeholder="Search name, grape, region, note…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex gap-1 pb-2.5">
          <button
            type="button"
            onClick={() => setView("grid")}
            className="rounded p-1.5 transition-colors"
            aria-label="Grid view"
          >
            <GridIcon active={view === "grid"} />
          </button>
          <button
            type="button"
            onClick={() => setView("gallery")}
            className="rounded p-1.5 transition-colors"
            aria-label="Gallery view"
          >
            <GalleryIcon active={view === "gallery"} />
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="border-t border-rule py-16 text-center text-[0.9375rem] text-muted">
          Nothing matches that.
        </p>
      ) : view === "gallery" && !searching ? (
        <div className="-mx-5">
          <WineRolodex wines={visible} />
        </div>
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
