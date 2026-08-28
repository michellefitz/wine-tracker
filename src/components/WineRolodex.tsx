"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LabelPhoto from "@/components/LabelPhoto";
import RatingMark from "@/components/RatingMark";
import { countryFlag } from "@/lib/places";
import type { Wine } from "@/lib/types";

type SimpleType = "Red" | "White" | "Sparkling" | "Other";

const GROUP_ORDER: SimpleType[] = ["Red", "White", "Sparkling", "Other"];

function simplifyType(wineType: string | null): SimpleType {
  if (!wineType) return "Other";
  const lower = wineType.toLowerCase();
  if (lower === "red") return "Red";
  if (lower === "white") return "White";
  if (lower === "sparkling") return "Sparkling";
  return "Other";
}

function groupWines(wines: Wine[]): Map<SimpleType, Wine[]> {
  const groups = new Map<SimpleType, Wine[]>();
  for (const type of GROUP_ORDER) groups.set(type, []);
  for (const wine of wines) {
    const type = simplifyType(wine.wine_type);
    groups.get(type)!.push(wine);
  }
  // Drop empty groups
  for (const [type, list] of groups) {
    if (list.length === 0) groups.delete(type);
  }
  return groups;
}

function RolodexRow({ wines, label }: { wines: Wine[]; label: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const updateScales = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const center = container.scrollLeft + container.clientWidth / 2;
    const cards = container.children;
    let closest = 0;
    let closestDist = Infinity;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(center - cardCenter);
      const maxDistance = container.clientWidth * 0.5;

      if (distance < closestDist) {
        closestDist = distance;
        closest = i;
      }

      const t = Math.min(distance / maxDistance, 1);
      const scale = 1 - t * 0.3;
      const opacity = 1 - t * 0.55;

      card.style.transform = `scale(${scale})`;
      card.style.opacity = String(opacity);
      card.style.zIndex = distance < 10 ? "1" : "0";
    }

    setFocusedIndex(closest);
  }, []);

  const onScroll = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      updateScales();
    });
  }, [updateScales]);

  useEffect(() => {
    updateScales();
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [updateScales]);

  const focusedWine = wines[focusedIndex];
  const flag = focusedWine ? countryFlag(focusedWine.country) : null;

  return (
    <section className="mt-7 first:mt-0">
      <div className="flex items-baseline justify-between px-5">
        <h2 className="eyebrow">{label}</h2>
        <span className="text-[0.6875rem] tabular-nums text-muted">
          {wines.length} {wines.length === 1 ? "bottle" : "bottles"}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="hide-scrollbar mt-3 flex snap-x snap-mandatory overflow-x-auto
          overflow-y-hidden px-[calc(50%-8rem)] py-4"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        {wines.map((wine) => (
          <Link
            key={wine.id}
            href={`/wine/${wine.id}`}
            className="relative w-64 shrink-0 -mr-8 snap-center active:scale-[0.97]"
            style={{ willChange: "transform, opacity", transformOrigin: "center center" }}
          >
            <div className="photo-bleed relative aspect-4/5 w-full overflow-hidden bg-tint">
              <LabelPhoto
                photoId={wine.photo_id}
                alt=""
                width={560}
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
        ))}
      </div>

      {/* Caption for the focused card only */}
      {focusedWine && (
        <div className="mt-2 min-h-16 px-5 text-center">
          <RatingMark score={focusedWine.score} />
          <h3 className="essay mt-1 text-[1.0625rem] leading-snug text-ink">
            {focusedWine.name}
          </h3>
          {(focusedWine.producer || focusedWine.vintage) && (
            <p className="mt-0.5 truncate text-[0.8125rem] text-ink-soft">
              {[focusedWine.producer, focusedWine.vintage].filter(Boolean).join(", ")}
            </p>
          )}
          {flag && (
            <p className="mt-0.5 text-[0.8125rem] text-muted">
              <span aria-hidden="true">{flag}</span>{" "}
              {focusedWine.region ?? focusedWine.country}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default function WineRolodex({ wines }: { wines: Wine[] }) {
  const groups = groupWines(wines);

  return (
    <div className="py-2">
      {GROUP_ORDER.filter((type) => groups.has(type)).map((type) => (
        <RolodexRow key={type} wines={groups.get(type)!} label={type} />
      ))}
    </div>
  );
}
