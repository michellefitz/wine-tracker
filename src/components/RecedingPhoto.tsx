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
 * Shrinking it on the way out means it leaves in half the distance and reads
 * as the bottle stepping back rather than the page shoving it off — and it
 * fades while it does, because things do that when they go away from you.
 *
 * On the way out is the point, and it took a try to get right: shrink it too
 * quickly and all of that happens while the bottle is still sitting in full
 * view, so you watch it resize and then, separately, watch it leave. The
 * distance and the anchor below are both set so that the shrinking, the fading
 * and the leaving are one movement.
 */

/** How small it gets before it's just something on its way out. */
const SMALLEST = 0.25;

/**
 * How far you scroll to get there, as a share of the picture's own height.
 *
 * Tied to the picture rather than a fixed number of pixels because the sheet
 * shows it smaller than the page does, and a fixed distance would shrink one
 * of them at half the rate of the other.
 *
 * Bigger than one, and that is the whole difference between shrinking and
 * leaving being one movement or two. Anchored at the bottom, the picture's
 * bottom edge rises at a pixel per pixel scrolled while its height falls at
 * (1 - SMALLEST) / TRAVEL of the same, and the top edge moves by the
 * difference. At 0.75 they cancel exactly: the bottle sits stock still,
 * finishes resizing, and only then travels — which is what it did, and what
 * was wrong with it. Above one the shrink is the slower of the two, so the
 * top edge climbs the whole time and the bottle is getting smaller on its way
 * out rather than before it.
 *
 * 1.15 is where it also finishes on time. The picture clears the top of the
 * view after about its own height plus the small gap above it — a seventh of
 * a height in the sheet, a sixth on the page — so a shrink spread over that
 * same distance lands the bottle at its smallest just as the last of it
 * leaves. Shorter and it is small and still hanging about; longer and it is
 * cut off mid-shrink.
 */
const TRAVEL = 1.15;

/**
 * Shrunk towards its own bottom edge, which is what keeps the page whole.
 *
 * A transform doesn't change the height the picture reserves, so whatever the
 * bottle gives up by shrinking is left as empty page somewhere — and the
 * anchor decides where. Below it, against the producer's name, it reads as a
 * hole: scaling about the middle opened a hundred-pixel band there halfway
 * through the scroll, and about the top it would be twice that. Anchoring the
 * bottom puts every pixel of it above the bottle instead, which is the part
 * already leaving the screen, and the gap between the picture and the writing
 * stays exactly what it is at rest for the whole of the scroll.
 *
 * This anchor is also why TRAVEL has to be above one; on its own it would
 * hold the bottle perfectly still. The two are a pair.
 */
const ORIGIN = "50% 100%";

/**
 * How far the fade goes by the time it's at its smallest.
 *
 * Not to nothing. Something that has faded out completely and is still taking
 * up room is a hole in the page, and the last stretch of the scroll would be
 * spent moving it — so it keeps enough presence to be a bottle on its way out
 * rather than a gap where one used to be. Two fifths is enough to feel like
 * distance and not enough to look like a failed image.
 */
const FAINTEST = 0.4;

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
    element.style.willChange = "transform, opacity";

    let frame = 0;
    let painted = -1;

    function draw() {
      frame = 0;
      if (!element) return;

      const top = scroller ? scroller.scrollTop : window.scrollY;
      const along = Math.min(1, Math.max(0, top / distance));

      // Nothing to say to the browser if it's already where it should be.
      if (Math.abs(along - painted) < 0.002) return;
      painted = along;

      if (along === 0) {
        // Cleared rather than set to their resting values, so an untouched
        // picture carries no inline styles and no compositor layer.
        element.style.transform = "";
        element.style.opacity = "";
        return;
      }
      element.style.transform = `scale(${1 - (1 - SMALLEST) * along})`;
      element.style.opacity = String(1 - (1 - FAINTEST) * along);
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
      element.style.opacity = "";
      element.style.transformOrigin = "";
      element.style.willChange = "";
    };
  }, []);

  return <div ref={box}>{children}</div>;
}
