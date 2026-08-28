"use client";

import Link from "next/link";
import LabelPhoto from "@/components/LabelPhoto";
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
  for (const [type, list] of groups) {
    if (list.length === 0) groups.delete(type);
  }
  return groups;
}

function Shelf({ wines, label }: { wines: Wine[]; label: string }) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow">{label}</h2>
        <span className="text-[0.6875rem] tabular-nums text-muted">
          {wines.length}
        </span>
      </div>

      {/* The shelf edge */}
      <div className="mt-2 border-b border-rule" />

      <div
        className="hide-scrollbar -mt-px flex overflow-x-auto pb-1"
        style={{ touchAction: "pan-x" }}
      >
        {wines.map((wine) => (
          <Link
            key={wine.id}
            href={`/wine/${wine.id}`}
            className="group relative shrink-0 px-1.5 pt-1 active:scale-[0.97]
              transition-transform duration-[120ms] ease-out-strong"
            style={{ width: `${100 / Math.min(wines.length, 4)}%`, maxWidth: "25%" }}
          >
            <div className="photo-bleed relative aspect-[3/5] w-full overflow-hidden">
              <LabelPhoto
                photoId={wine.photo_id}
                alt={wine.name}
                width={560}
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom shelf edge */}
      <div className="border-b border-rule" />
    </section>
  );
}

export default function WineRolodex({ wines }: { wines: Wine[] }) {
  const groups = groupWines(wines);

  return (
    <div className="px-5 py-2">
      {GROUP_ORDER.filter((type) => groups.has(type)).map((type) => (
        <Shelf key={type} wines={groups.get(type)!} label={type} />
      ))}
    </div>
  );
}
