"use client";

import { useEffect, useRef } from "react";

/**
 * The bottle, getting smaller as you read past it.
 *
 * A picture at the top of a sheet has two jobs that pull against each other:
 * it should be the first thing you see, at the size that makes it worth
 * looking at, and it should be gone by the time you're reading. Scrolling
 * alone does the second badly — a tall photo takes half a screen of travel to
 * leave, and all of that travel is spent moving a picture you've finished
 * with.
 *
 * Shrinking it as it goes means it leaves in half the distance and reads as
 * the bottle stepping back rather than the page shoving it off.
 */

/** How small it gets before it's just something on its way out. */
const SMALLEST = 0.25;

/**
 * How far you scroll to get there, as a share of the picture's own height —
 * and not a free choice: it is exactly the height the picture gives up.
 *
 * Tied to the picture rather than a fixed number of pixels because the sheet
 * shows it smaller than the page does, and a fixed distance would shrink one
 * of them at half the rate of the other.
 *
 * Tied to SMALLEST because of what happens at this particular ratio. The
 * bottom edge rises at one pixel per pixel scrolled, and the height falls at
 * (1 - SMALLEST) / TRAVEL of the same — so when those match, the two cancel
 * along the top edge and it does not move at all. The bottle holds its place
 * and recedes, the writing climbs to meet it, and only once it is small does
 * it start to travel. Every other ratio slides it up the screen while it
 * shrinks, which reads as the page shoving it out rather than the bottle
 * stepping back.
 *
 * So: change SMALLEST if it should end up bigger or smaller, and this follows
 * on its own. Setting it to something else is a different effect, not a
 * tuning of this one.
 */
const TRAVEL = 1 - SMALLEST;

/**
 * Shrunk towards its own bottom edge, which is the whole trick.
 *
 * Scaling about the middle or the top leaves a growing band of empty page
 * between the picture and the producer's name below it — the bottle pulls away
 * from the writing and the gap reads as a layout fault rather than an effect.
 * Anchoring the bottom edge keeps the bottle sitting exactly where it sat, on
 * top of the writing, and puts all the reclaimed space above it instead, which
 * is the part already leaving the screen.
 */
const ORIGIN = "50% 100%";

export default function RecedingPhoto({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = box.current;
    if (!element) return;

    // Someone who has asked for less movement has asked for this too.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /*
     * Whatever is actually scrolling. As a page that's the window; in a sheet
     * it's the panel's own scroller, and the window never moves at all — so
     * listening to the window would have left this doing nothing in the one
     * place it was asked for.
     */
    let scroller: HTMLElement | null = null;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const overflow = getComputedStyle(parent).overflowY;
      if (overflow === "auto" || overflow === "scroll") {
        scroller = parent;
        break;
      }
    }
    const source: HTMLElement | Window = scroller ?? window;

    /*
     * Measured on the way in and kept, not read per frame. offsetHeight forces
     * layout, and asking for it on every scroll frame is how a smooth effect
     * turns into a stuttering one. A transform doesn't change it, so the only
     * thing that can is a resize.
     */
    let distance = Math.max(1, element.offsetHeight * TRAVEL);
    const watcher = new ResizeObserver(() => {
      distance = Math.max(1, element.offsetHeight * TRAVEL);
    });
    watcher.observe(element);

    element.style.transformOrigin = ORIGIN;
    element.style.willChange = "transform";

    let frame = 0;
    let painted = -1;

    function draw() {
      frame = 0;
      if (!element) return;

      const top = scroller ? scroller.scrollTop : window.scrollY;
      const along = Math.min(1, Math.max(0, top / distance));
      const scale = 1 - (1 - SMALLEST) * along;

      // Nothing to say to the browser if it's already where it should be.
      if (Math.abs(scale - painted) < 0.001) return;
      painted = scale;
      element.style.transform = along > 0 ? `scale(${scale})` : "";
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    // Sheets can open onto a list already scrolled, and a page can be restored
    // mid-scroll, so start from wherever it actually is rather than from zero.
    draw();
    source.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      source.removeEventListener("scroll", onScroll);
      watcher.disconnect();
      if (frame) cancelAnimationFrame(frame);
      element.style.transform = "";
      element.style.transformOrigin = "";
      element.style.willChange = "";
    };
  }, []);

  return <div ref={box}>{children}</div>;
}
