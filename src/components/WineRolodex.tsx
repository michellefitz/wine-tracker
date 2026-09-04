"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import LabelPhoto from "@/components/LabelPhoto";
import type { Wine } from "@/lib/types";

type SimpleType = "Red" | "White" | "Sparkling" | "Other";

const GROUP_ORDER: SimpleType[] = ["Red", "White", "Sparkling", "Other"];

/**
 * How far a bottle at the edge of the shelf is pushed away from you.
 *
 * Small numbers on purpose. This is an exhibition shelf, not a carousel from a
 * 2009 media player — the arc should be the thing you notice you can't quite
 * name, not an effect.
 */
/** Between bottles, in pixels. Named because the widths have to subtract it. */
const GAP = 6;

const ARC = {
  /** Shrink at the edges, so the middle bottle is the one you're looking at. */
  scale: 0.13,
  /** The dip: edges sit lower, which curves the row rather than tilting it. */
  dip: 14,
  /** Degrees, fanning outwards from the middle. */
  tilt: 3.5,
  /**
   * Edges recede a little. Gently — this compounds with the mask that fades
   * the right-hand edge, and at 0.3 the two together took the fourth bottle
   * down to about a third opacity, which is no longer a hint, just a smudge.
   */
  fade: 0.16,
};

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
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  /*
   * Three and a bit, deliberately.
   *
   * Three bottles filling the row exactly is what made the shelf look like the
   * whole shelf: the last one ended flush with the edge of the screen, which is
   * precisely what a list that has run out looks like. At 27% a fourth bottle
   * starts about fifty pixels before the edge and gets cut off by it, and a
   * thing cut off by the edge of the screen can only mean there is more of it
   * over there. 29% was tried first and left a sliver too narrow to read as a
   * bottle once the edge fade had been over it.
   *
   * Fewer than four and there's nothing to hint at, so they share the row.
   * Sharing it exactly, gaps subtracted: at plain 100/n the gaps push the row
   * a few pixels wider than the scroller, which is enough for "is there more
   * to the right" to answer yes on a shelf holding two bottles.
   */
  const peeks = wines.length > 3;
  const width = peeks
    ? "27%"
    : `calc((100% - ${(wines.length - 1) * GAP}px) / ${wines.length})`;

  /**
   * Lays the bottles on a curve, from where the scroll happens to be.
   *
   * Measured rather than animated: each bottle's distance from the middle of
   * the shelf decides how far away it looks, so the arc holds at any scroll
   * position, mid-flick included, and there's no state to get out of step with
   * the finger. Runs inside a frame because scroll fires far more often than
   * the screen redraws.
   */
  const layout = useCallback(() => {
    const node = scroller.current;
    if (!node) return;

    const middle = node.scrollLeft + node.clientWidth / 2;
    const reach = node.clientWidth / 2;
    /*
     * The arc moves with the finger, which is the sort of thing someone who
     * has asked their phone to stop animating things has asked it to stop
     * doing. The peek and the edge fades stay — those are layout, not motion,
     * and they're the part that answers "is there more".
     */
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    for (const child of Array.from(node.children) as HTMLElement[]) {
      const centre = child.offsetLeft + child.offsetWidth / 2;
      // -1 at the left edge, 0 dead centre, 1 at the right.
      const t = Math.max(-1, Math.min(1, (centre - middle) / reach));
      const away = Math.abs(t);

      child.style.transform = still
        ? ""
        : `translateY(${(away * ARC.dip).toFixed(2)}px) ` +
          `rotate(${(t * ARC.tilt).toFixed(2)}deg) ` +
          `scale(${(1 - away * ARC.scale).toFixed(3)})`;
      child.style.opacity = still ? "" : String(1 - away * ARC.fade);
    }

    /*
     * Which edges are hiding something. A fade is a promise that the shelf
     * carries on, so it goes where that's true and nowhere else: fading the
     * last bottle when there is genuinely nothing after it reads as a
     * rendering fault rather than an invitation.
     */
    const room = node.scrollWidth - node.clientWidth;
    const back = room > 4 && node.scrollLeft > 4;
    const on = room > 4 && node.scrollLeft < room - 4;
    node.dataset.edges = back && on ? "both" : on ? "right" : back ? "left" : "none";
  }, []);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(layout);
  }, [layout]);

  useEffect(() => {
    layout();
    const node = scroller.current;
    if (!node) return;

    // Widths here are percentages, so every one of them changes on rotate.
    const watch = new ResizeObserver(layout);
    watch.observe(node);
    return () => {
      cancelAnimationFrame(frame.current);
      watch.disconnect();
    };
  }, [layout]);

  return (
    <section className="mt-8 first:mt-0">
      <h2 className="essay text-[1.375rem] leading-none text-ink-soft">{label}</h2>

      <div
        ref={scroller}
        onScroll={onScroll}
        data-edges="none"
        style={{ gap: `${GAP}px` }}
        className="rolodex hide-scrollbar mt-3 flex overflow-x-auto pb-1"
      >
        {wines.map((wine) => (
          <Link
            key={wine.id}
            href={`/wine/${wine.id}`}
            style={{ width, transformOrigin: "50% 100%" }}
            className="shrink-0 will-change-transform active:brightness-95"
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
