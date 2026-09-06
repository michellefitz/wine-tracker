"use client";

import { usePathname, useRouter } from "next/navigation";
import { PAPER, SCRIMMED } from "@/lib/chrome";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A bottom sheet over whatever you were looking at.
 *
 * This is what a phone does instead of a page. The shelf stays where you left
 * it, the bottle comes up over it, and a flick downwards puts it away — no
 * back button, no reload of the list, no losing your scroll position.
 *
 * Dismissal is a real drag, not a button pretending to be one. The rules that
 * make it feel like the operating system rather than a web page:
 *
 *   - It only starts when the content is already scrolled to the top, so
 *     reading never fights the gesture.
 *   - Pulling past the top is resisted, not free — the sheet follows at a third
 *     of your finger once you're past the threshold, the way a rubber band does.
 *   - A fast flick closes it regardless of distance. Everyone flicks.
 *   - Let go too early and it springs back rather than sitting where dropped.
 *
 * Above all of that: a sheet on its way out must never be able to hold the app
 * hostage. It covers the whole screen and locks the page behind it, so every
 * exit path here gives both of those up immediately and unconditionally — see
 * `close`. Getting that wrong froze the app until it was force-quit.
 */

/** Past this much, or this fast, and letting go closes it. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.55; // px per ms

/** How much of a slow drag actually shows on screen, past the first 40px. */
const RESISTANCE = 0.36;

/**
 * Counted, not a flag. Opening a grape from inside a bottle swaps one sheet for
 * another, and React can mount the new one before unmounting the old — so the
 * new sheet reads "hidden" as the value to restore and puts it back on the way
 * out, locking the page for good. Counting survives the overlap.
 */
let scrollLocks = 0;

function lockScroll() {
  scrollLocks += 1;
  document.body.style.overflow = "hidden";
}

function releaseScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = "";
}

/**
 * Which sheet is already up, so the next one knows whether it is arriving or
 * carrying on.
 *
 * A sheet is mounted twice for one opening. The loading file puts the panel on
 * screen immediately with a skeleton in it; when the bottle arrives, React
 * throws that whole tree away and mounts the page's — a different instance, a
 * different element, and a CSS entrance animation that would play again, so
 * the panel would drop and fly back up at the exact moment the content
 * appeared. The two are the same sheet as far as anyone looking at it is
 * concerned, and this is how the second one knows.
 *
 * Keyed by path and counted, not timed. Timing can't tell the swap apart from
 * a quick second tap, whereas the swap is exactly the case where a sheet for
 * this same URL is already mounted when the next one arrives. Counting handles
 * the mount order, which is not guaranteed: React can mount the replacement
 * before unmounting the one it replaces, so the key is only cleared when the
 * last sheet has actually gone — which also covers leaving by the back button,
 * where nothing else runs.
 */
let live = 0;
let showing: string | null = null;

/**
 * Keep the strip behind the clock the colour of whatever is under it.
 *
 * Installed on a phone, there is no browser chrome across the top and bottom
 * of the screen to hide the edges of the app — the system draws that strip
 * itself, from the theme-color meta tag. Ours said paper, permanently, so with
 * a sheet up and the shelf dimmed behind it the strip stayed the one bright
 * band on a darkened screen, and it lagged behind the change on the way back
 * out. Either way it read as a bar that shouldn't be there.
 *
 * Moved with the sheet, it stops being a bar at all: it is the same colour as
 * the pixels immediately below it in both states, which is the only thing that
 * makes a strip you cannot style disappear.
 */
let painted: string | null = null;

function paintChrome(colour: string) {
  if (painted === colour) return;
  painted = colour;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute("content", colour);

  /*
   * ...and then put the tag back where it already is, which is not as silly as
   * it looks.
   *
   * iOS does not repaint that strip when the attribute changes. It repaints it
   * when something else makes it look again, and the something else was the
   * skeleton handing over to the bottle — so the strip sat at the old colour
   * for the whole of the opening and only caught up, about seven hundred
   * milliseconds late, when the content arrived. On the way out there was
   * nothing to prompt it at all until the sheet had gone.
   *
   * Taking the node out and putting it straight back is a mutation of the head
   * rather than of an attribute, and that it does notice. The same node goes
   * back in the same place, so whatever Next thinks it owns, it still owns.
   */
  const parent = meta.parentNode;
  if (!parent) return;
  const after = meta.nextSibling;
  parent.removeChild(meta);
  parent.insertBefore(meta, after);
}

export default function Sheet({
  children,
  label,
  dismiss = "anywhere",
}: {
  children: React.ReactNode;
  /** What the sheet is, for anyone not looking at it. */
  label: string;
  /**
   * Where the closing drag may start.
   *
   * "anywhere" is right for something you read: the whole surface is inert, so
   * the whole surface can be grabbed. "handle" is for a sheet holding a form,
   * where a downward swipe over a text field is far more likely to be a thumb
   * missing its target than a decision to throw away what you typed. There is
   * no undo behind this — the handle and the scrim are deliberate acts, and a
   * form should need one.
   */
  dismiss?: "anywhere" | "handle";
}) {
  const router = useRouter();
  const here = usePathname();
  const panel = useRef<HTMLDivElement>(null);

  /*
   * Read once, on the way in: whether a sheet for this same URL was already up.
   * useState rather than a ref because it has to be settled before the first
   * paint — a class added afterwards would play the animation and then cancel
   * it, which is the flicker this exists to avoid.
   */
  const [continuing] = useState(() => live > 0 && showing === here);
  const scrim = useRef<HTMLButtonElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const [leaving, setLeaving] = useState(false);
  /** Set when the route never took us away — see `close`. */
  const [gone, setGone] = useState(false);

  const closing = useRef(false);
  const dragDismissing = useRef(false);
  const holdsLock = useRef(false);

  const drag = useRef({
    active: false,
    watching: false,
    startY: 0,
    lastY: 0,
    lastAt: 0,
    velocity: 0,
  });

  useEffect(() => {
    lockScroll();
    holdsLock.current = true;

    live += 1;
    showing = here;
    if (live === 1) paintChrome(SCRIMMED);

    return () => {
      live = Math.max(0, live - 1);
      if (live === 0) {
        showing = null;
        // A net, not the main path: the back button unmounts this without any
        // of the above running. paintChrome ignores a colour already showing,
        // so a normal dismissal doesn't touch the head twice.
        paintChrome(PAPER);
      }

      if (!holdsLock.current) return;
      holdsLock.current = false;
      releaseScroll();
    };
  }, [here]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setLeaving(true);

    /*
     * Now, with the scrim, and not when this finally unmounts.
     *
     * That was the lag on the way out. The strip was repainted from the effect
     * cleanup, which does not run until router.back() has actually taken us
     * off this route — a couple of hundred milliseconds after the scrim has
     * finished fading and the shelf is bright again. So the page came back and
     * the strip stayed dark, exactly as long as it took the route to change.
     */
    paintChrome(PAPER);

    /*
     * Hand the page back before anything else. Everything below this line can
     * fail — the history entry may not exist, the route may not change — and
     * none of it may leave the page scroll-locked under an invisible full
     * screen button. `leaving` also turns off pointer events on the way out.
     */
    if (holdsLock.current) {
      holdsLock.current = false;
      releaseScroll();
    }

    // Let the exit animation run before the route changes underneath it.
    const back = window.setTimeout(() => router.back(), 220);

    /*
     * And a way out of the way out. router.back() does nothing when there's no
     * entry behind this one — opening the installed app straight onto a bottle,
     * say — which used to leave the sheet mounted and latched shut. If we're
     * still here well after the animation, stop rendering rather than sit on
     * top of the app.
     */
    const giveUp = window.setTimeout(() => setGone(true), 1200);

    return () => {
      window.clearTimeout(back);
      window.clearTimeout(giveUp);
    };
  }, [router]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  function offsetTo(y: number) {
    if (!panel.current) return;
    panel.current.style.transform = y > 0 ? `translate3d(0, ${y}px, 0)` : "";
  }

  function onPointerDown(event: React.PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    /*
     * Only from the top of the scroll: mid-article, a downward swipe is
     * reading. Doesn't apply to the handle, which is above the scroller and
     * never competing with it — grabbing it means the same thing at any depth.
     */
    if (dismiss === "anywhere" && (scroller.current?.scrollTop ?? 0) > 0) return;

    drag.current = {
      active: false,
      watching: true,
      startY: event.clientY,
      lastY: event.clientY,
      lastAt: event.timeStamp,
      velocity: 0,
    };

    /*
     * The handle is a 26px strip, and the first move of any real drag is
     * already past the bottom of it. Waiting to claim the pointer until the
     * drag proves itself — which is right when the whole panel is listening,
     * since the pointer can't leave it — means the move that would have proved
     * it is delivered somewhere else, and the sheet can be pressed but never
     * pulled. Claim it on contact instead; there's nothing else in the strip to
     * take it from.
     */
    if (dismiss === "handle") event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const state = drag.current;
    if (!state.watching) return;

    const dy = event.clientY - state.startY;

    // Upwards, or barely moved: leave it to the scroller.
    if (!state.active) {
      if (dy < 6) {
        if (dy < -6) state.watching = false;
        return;
      }
      state.active = true;
      /*
       * Capture on whatever is carrying these handlers, not on the panel:
       * capturing retargets every later pointer event to the capturing element,
       * and events don't bubble downwards, so capturing on the panel while the
       * listeners sat on a child inside it would send the release somewhere it
       * could never be heard. Already held when the drag started at the handle.
       */
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      // Freeze the scroll while dragging, or the two fight over the finger.
      if (scroller.current) scroller.current.style.overflowY = "hidden";
      if (panel.current) panel.current.style.transition = "none";
    }

    const elapsed = event.timeStamp - state.lastAt;
    if (elapsed > 0) {
      state.velocity = (event.clientY - state.lastY) / elapsed;
      state.lastY = event.clientY;
      state.lastAt = event.timeStamp;
    }

    offsetTo(dy < 40 ? dy : 40 + (dy - 40) * (1 + RESISTANCE) * 0.75);
  }

  function endDrag(event: React.PointerEvent) {
    const state = drag.current;
    if (!state.watching) return;

    const dy = event.clientY - state.startY;
    const wasActive = state.active;
    drag.current = { ...state, active: false, watching: false };

    if (scroller.current) scroller.current.style.overflowY = "";
    if (panel.current) panel.current.style.transition = "";
    if (!wasActive) return;

    if (dy > DISMISS_DISTANCE || state.velocity > DISMISS_VELOCITY) {
      // Animate out with WAAPI so it can't fight CSS animations.
      const easing = "cubic-bezier(0.32, 0.72, 0, 1)";

      /*
       * Its own height, not a distance worked out from where it is now.
       *
       * That was the bug, and it hid behind the browser: the target was
       * window.innerHeight minus the panel's current top, but its current top
       * already included how far you had dragged it — so the further you
       * pulled, the further short it stopped. Dragged the 110px that dismisses
       * it, the panel settled 110px shy of gone and sat there in plain sight
       * until the route caught up. In a tab that strip is under the browser's
       * own furniture and nobody sees it; installed, there is nothing there to
       * hide it.
       *
       * The panel sits on the bottom of the screen, so a translation of its own
       * height clears it exactly, whatever the drag did and whatever iOS thinks
       * the viewport is this second. A single keyframe animates from the
       * transform already on the element, so it still starts from your finger.
       */
      panel.current?.animate(
        [{ transform: "translate3d(0, 100%, 0)" }],
        { duration: 220, easing, fill: "forwards" },
      );
      scrim.current?.animate(
        [{ opacity: 0 }],
        { duration: 120, easing, fill: "forwards" },
      );

      dragDismissing.current = true;
      // With the animation, for the same reason close() does it: this path
      // doesn't reach close() for another 200ms, which is most of the way
      // through the sheet leaving.
      paintChrome(PAPER);
      window.setTimeout(() => close(), 200);
      return;
    }
    if (panel.current) {
      panel.current.style.transition = "transform 200ms cubic-bezier(0.23, 1, 0.32, 1)";
    }
    offsetTo(0);
  }

  if (gone) return null;

  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`fixed inset-0 z-50 ${leaving ? "pointer-events-none" : ""} ${leaving && !dragDismissing.current ? "sheet-leaving" : ""}`}
    >
      {/* Tapping the strip of page still showing puts the sheet away. */}
      <button
        ref={scrim}
        type="button"
        aria-label="Close"
        onClick={close}
        className={`sheet-scrim absolute inset-0 w-full cursor-default bg-ink/20 ${
          continuing ? "" : "scrim-enter"
        }`}
      />

      <div
        ref={panel}
        className={`sheet-panel absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col
          overflow-hidden rounded-t-[1.25rem] bg-paper shadow-[0_-1px_24px_rgba(0,0,0,0.14)] ${
            continuing ? "" : "sheet-enter"
          }`}
        {...(dismiss === "anywhere" ? handlers : {})}
        style={{ touchAction: "pan-y" }}
      >
        {/*
          The handle says "this one moves" without a line of text — and when
          it's the only thing that moves, it's also the whole hit area, so it
          gets the room to be hit.
        */}
        <div
          className={`flex shrink-0 justify-center pb-1 pt-2.5 ${
            dismiss === "handle" ? "cursor-grab pb-3" : ""
          }`}
          {...(dismiss === "handle" ? handlers : {})}
          style={dismiss === "handle" ? { touchAction: "none" } : undefined}
        >
          <span aria-hidden="true" className="h-1 w-9 rounded-full bg-rule" />
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
