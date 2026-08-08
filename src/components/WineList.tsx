"use client";

import { useMemo, useState } from "react";
import WineCard from "@/components/WineCard";
import type { Wine } from "@/lib/types";

type Filter = "all" | "liked" | "disliked";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "liked", label: "Liked" },
  { id: "disliked", label: "Didn't like" },
];

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

export default function WineList({ wines }: { wines: Wine[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return wines.filter((wine) => {
      if (filter === "liked" && wine.score < 1) return false;
      if (filter === "disliked" && wine.score > -1) return false;
      if (needle && !haystack(wine).includes(needle)) return false;
      return true;
    });
  }, [wines, filter, query]);

  if (wines.length === 0) {
    return (
      <div className="border-t border-rule py-20 text-center">
        <p className="mx-auto max-w-xs font-display text-2xl leading-snug text-ink">
          Start with the last bottle you opened.
        </p>
        <p className="mx-auto mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-muted">
          Photograph the label, say whether you liked it, and it&apos;s in the log. The
          shelf gets much easier after a dozen of these.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <input
          type="search"
          className="field text-[0.9375rem]"
          placeholder="Search name, grape, region, note…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="mt-4 flex gap-5">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`pb-1 text-[0.6875rem] font-medium uppercase tracking-[0.14em]
                transition-colors ${
                  filter === option.id
                    ? "border-b border-ink text-ink"
                    : "border-b border-transparent text-muted hover:text-ink-soft"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="border-t border-rule py-16 text-center text-[0.9375rem] text-muted">
          Nothing matches that.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-5">
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
