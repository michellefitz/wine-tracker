"use client";

import { useCallback, useEffect, useRef } from "react";
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

  const updateScales = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const center = container.scrollLeft + container.clientWidth / 2;
    const cards = container.children;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(center - cardCenter);
      const maxDistance = container.clientWidth * 0.6;

      // Continuous scale: 1.0 at center, 0.85 at the edges
      const t = Math.min(distance / maxDistance, 1);
      const scale = 1 - t * 0.15;
      // Opacity: 1.0 at center, 0.55 at the edges
      const opacity = 1 - t * 0.45;

      card.style.transform = `scale(${scale})`;
      card.style.opacity = String(opacity);
    }
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

  return (
    <section className="mt-8 first:mt-0">
      <div className="flex items-baseline justify-between px-5">
        <h2 className="eyebrow">{label}</h2>
        <span className="text-[0.6875rem] tabular-nums text-muted">
          {wines.length} {wines.length === 1 ? "bottle" : "bottles"}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="hide-scrollbar mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto
          px-[calc(50%-7rem)] pb-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {wines.map((wine) => {
          const flag = countryFlag(wine.country);
          return (
            <Link
              key={wine.id}
              href={`/wine/${wine.id}`}
              className="w-56 shrink-0 snap-center transition-transform
                duration-[60ms] ease-out active:scale-[0.97]"
              style={{ willChange: "transform, opacity" }}
            >
              <div className="photo-bleed relative aspect-4/5 w-full overflow-hidden bg-tint">
                <LabelPhoto
                  photoId={wine.photo_id}
                  alt=""
                  width={560}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="pt-3 text-center">
                <RatingMark score={wine.score} />
                <h3 className="essay mt-1.5 text-[1.0625rem] leading-snug text-ink">
                  {wine.name}
                </h3>
                {(wine.producer || wine.vintage) && (
                  <p className="mt-1 truncate text-[0.8125rem] text-ink-soft">
                    {[wine.producer, wine.vintage].filter(Boolean).join(", ")}
                  </p>
                )}
                {flag && (
                  <p className="mt-0.5 text-[0.8125rem] text-muted">
                    <span aria-hidden="true">{flag}</span>{" "}
                    {wine.region ?? wine.country}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
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
