"use client";

import Link from "next/link";
import { useState } from "react";
import RatingMark from "@/components/RatingMark";
import RegionMap, { type PlateMark, type PlateRegion } from "@/components/RegionMap";
import type { Ring } from "@/lib/map-geometry";

/**
 * The map and what you tapped on it.
 *
 * Selection lives here rather than in the map because it belongs to both: the
 * shape lights up, and the same tap fills the panel underneath with the
 * bottles from that place. From there a bottle is an ordinary link, so it
 * arrives as a sheet over the map exactly as it would over the shelf — the
 * map isn't a special place with its own way of opening a wine.
 */
export default function CountryMap({
  land,
  regions,
  marks,
  countryName,
}: {
  land: Ring[];
  regions: PlateRegion[];
  marks: PlateMark[];
  countryName: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const chosen =
    regions.find((region) => region.key === selected) ??
    marks.find((mark) => mark.key === selected) ??
    null;

  const mine = [
    ...regions.filter((region) => region.bottles.length > 0),
    ...marks,
  ].sort((a, b) => b.bottles.length - a.bottles.length || a.name.localeCompare(b.name));

  return (
    <div>
      <div className="border-y border-rule">
        <RegionMap land={land} regions={regions} marks={marks} selected={selected} onSelect={setSelected} />
      </div>

      <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
        {regions.length > 0
          ? `Every appellation ${countryName} registers, ${regions.length} of them. `
          : ""}
        Filled ones are yours. Drag to move, pinch or scroll to zoom, tap a
        region to see what you drank from it.
      </p>

      {/*
        The panel, and the list it replaces. One region at a time when you've
        chosen one, everything you've drunk when you haven't — rather than a
        panel that appears below a list and pushes it about.
      */}
      {chosen ? (
        <section className="mt-6">
          <div className="flex items-baseline justify-between gap-5 border-b border-rule pb-2.5">
            <h2 className="essay text-[1.375rem] leading-tight text-ink">{chosen.name}</h2>
            <button type="button" onClick={() => setSelected(null)} className="link-plain shrink-0">
              Close
            </button>
          </div>

          {chosen.bottles.length === 0 ? (
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
              Nothing from here yet — one of the {regions.length} appellations in{" "}
              {countryName} you haven&apos;t drunk.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-rule">
              {chosen.bottles.map((wine) => (
                <li key={wine.id}>
                  <Link
                    href={`/wine/${wine.id}`}
                    className="flex items-baseline justify-between gap-6 py-3"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="essay text-[1.0625rem] text-ink">{wine.name}</span>
                      {wine.producer && (
                        <span className="text-[0.8125rem] text-muted">{wine.producer}</span>
                      )}
                    </span>
                    <RatingMark score={wine.score} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="mt-6">
          <h2 className="eyebrow mb-2">Where you&apos;ve drunk from</h2>
          <ul className="divide-y divide-rule">
            {mine.map((region) => (
              <li key={region.key}>
                <button
                  type="button"
                  onClick={() => setSelected(region.key)}
                  className="flex w-full items-baseline justify-between gap-6 py-3 text-left"
                >
                  <span className="text-[0.9375rem] text-ink">{region.name}</span>
                  <span className="eyebrow whitespace-nowrap">
                    {region.bottles.length === 1 ? "1 bottle" : `${region.bottles.length} bottles`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
