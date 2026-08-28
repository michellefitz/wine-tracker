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
    <section className="mt-8 first:mt-0">
      <h2 className="essay text-[1.375rem] leading-none text-ink-soft">{label}</h2>

      <div
        className="hide-scrollbar mt-3 flex overflow-x-auto"
      >
        {wines.map((wine) => (
          <Link
            key={wine.id}
            href={`/wine/${wine.id}`}
            className="shrink-0 px-1 active:scale-[0.97]
              transition-transform duration-[120ms] ease-out-strong"
            style={{ width: `${100 / Math.min(wines.length, 3)}%`, maxWidth: "33.333%" }}
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
    </section>
  );
}

export default function WineRolodex({ wines }: { wines: Wine[] }) {
  const groups = groupWines(wines);

  return (
    <div className="py-2">
      {GROUP_ORDER.filter((type) => groups.has(type)).map((type) => (
        <Shelf key={type} wines={groups.get(type)!} label={type} />
      ))}
    </div>
  );
}
