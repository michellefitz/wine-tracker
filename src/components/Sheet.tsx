"use client";

import { useRouter } from "next/navigation";
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
  const panel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const [leaving, setLeaving] = useState(false);
  /** Set when the route never took us away — see `close`. */
  const [gone, setGone] = useState(false);

  const closing = useRef(false);
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

    return () => {
      if (!holdsLock.current) return;
      holdsLock.current = false;
      releaseScroll();
    };
  }, []);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setLeaving(true);

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
      close();
      return;
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
      className={`fixed inset-0 z-50 ${leaving ? "sheet-leaving pointer-events-none" : ""}`}
    >
      {/* Tapping the strip of page still showing puts the sheet away. */}
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="sheet-scrim absolute inset-0 w-full cursor-default bg-ink/20"
      />

      <div
        ref={panel}
        className="sheet-panel absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col
          overflow-hidden rounded-t-[1.25rem] bg-paper shadow-[0_-1px_24px_rgba(0,0,0,0.14)]"
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
