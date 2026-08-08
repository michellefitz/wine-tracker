"use client";

import { useMemo, useState } from "react";
import WineCard from "@/components/WineCard";
import type { Wine } from "@/lib/types";

type Filter = "all" | "liked" | "disliked";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everything" },
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
      <div className="rounded-2xl border border-dashed border-line bg-surface/50 p-8 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl text-ink">
          Start with the last bottle you opened.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          Snap the label, say whether you liked it, and it&apos;s in the log. The shelf in
          the supermarket gets a lot easier after a dozen of these.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 space-y-3">
        <input
          type="search"
          className="field"
          placeholder="Search names, grapes, regions, notes…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`chip ${filter === option.id ? "chip-on" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nothing matches that.</p>
      ) : (
        <ul className="space-y-3">
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
