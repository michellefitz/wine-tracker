"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import LabelPhoto from "@/components/LabelPhoto";
import type { Wine } from "@/lib/types";

type SimpleType = "Red" | "White" | "Sparkling" | "Other";

const GROUP_ORDER: SimpleType[] = ["Red", "White", "Sparkling", "Other"];

/** Between bottles, in pixels. Named because the widths have to subtract it. */
const GAP = 6;

/**
 * How far back a bottle at the edge of the shelf sits.
 *
 * Scale, and nothing else. This started as a proper arc — a dip, a tilt, the
 * edges faded — and on a phone it was awful: dragging sideways moved every
 * bottle up and down as its dip changed, so the whole row bobbed under the
 * finger. Vertical motion in a thing you are moving horizontally reads as the
 * row coming loose, not as depth.
 *
 * So the shelf stays flat. The middle bottle is a little larger than the ones
 * either side of it, they all stand on the same line, and nothing moves on any
 * axis but the one your finger is on.
 */
const ZOOM = 0.08;

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
   * Which bottle is under a finger right now.
   *
   * There is half a second between tapping a bottle and the sheet arriving,
   * and without something happening in it the tap and the sheet are two
   * unrelated events — worse when the tap misses and nothing arrives at all,
   * because then there was never any way to tell the difference. This is the
   * bottle giving slightly under the thumb, and it is the only thing standing
   * in for the connection.
   *
   * It lives on the picture inside the card rather than on the card, because
   * the card's own transform is written from the scroll position every frame
   * and a press has to be able to animate on its own clock without fighting
   * that.
   *
   * State rather than a ref: this has to repaint, and it happens once per tap.
   */
  const [pressed, setPressed] = useState<string | null>(null);

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
   * Sizes the bottles from where the scroll happens to be.
   *
   * Measured rather than animated: each bottle's distance from the middle of
   * the shelf decides how large it is, so it holds at any scroll position,
   * mid-flick included, and there's no state to get out of step with the
   * finger. Runs inside a frame because scroll fires far more often than the
   * screen redraws.
   */
  const layout = useCallback(() => {
    const node = scroller.current;
    if (!node) return;

    const middle = node.scrollLeft + node.clientWidth / 2;
    const reach = node.clientWidth / 2;
    /*
     * The zoom moves with the finger, which is the sort of thing someone who
     * has asked their phone to stop animating things has asked it to stop
     * doing. The peek and the edge fades stay — those are layout, not motion,
     * and they're the part that answers "is there more".
     */
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    for (const child of Array.from(node.children) as HTMLElement[]) {
      const centre = child.offsetLeft + child.offsetWidth / 2;
      // 0 dead centre, 1 at either edge.
      const away = Math.min(1, Math.abs(centre - middle) / reach);
      child.style.transform = still ? "" : `scale(${(1 - away * ZOOM).toFixed(3)})`;
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
    /*
     * The shelf moved, so that press was the start of a scroll and not a tap.
     * Letting it stand is how a bottle ends up sitting there pressed while you
     * swipe away from it — which is the flicker that got the old press state
     * removed in the first place.
     */
    setPressed(null);
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
        className="rolodex hide-scrollbar mt-3 flex select-none overflow-x-auto pb-1"
      >
        {wines.map((wine) => (
          <Link
            key={wine.id}
            href={`/wine/${wine.id}`}
            onPointerDown={() => setPressed(wine.id)}
            onPointerUp={() => setPressed(null)}
            onPointerCancel={() => setPressed(null)}
            onPointerLeave={() => setPressed(null)}
            style={{ width, transformOrigin: "50% 100%" }}
            /*
              draggable={false} because a link wrapping an image is a drag
              handle by default: pulling the shelf sideways started a
              drag-and-drop of the picture instead of a scroll, and drew a
              selection box round every bottle on the way past.
            */
            draggable={false}
            className="shrink-0 will-change-transform"
          >
            <div
              className={`photo-bleed relative aspect-[3/5] w-full overflow-hidden
                transition-transform duration-[130ms] ease-out-strong ${
                  pressed === wine.id ? "scale-[0.93]" : "scale-100"
                }`}
            >
              <LabelPhoto
                photoId={wine.photo_id}
                alt={wine.name}
                width={560}
                draggable={false}
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
