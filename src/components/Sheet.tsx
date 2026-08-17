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
 */

/** Past this much, or this fast, and letting go closes it. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.55; // px per ms

/** How much of a slow drag actually shows on screen, past the first 40px. */
const RESISTANCE = 0.36;

export default function Sheet({
  children,
  label,
}: {
  children: React.ReactNode;
  /** What the sheet is, for anyone not looking at it. */
  label: string;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  const drag = useRef({
    active: false,
    watching: false,
    startY: 0,
    lastY: 0,
    lastAt: 0,
    velocity: 0,
  });

  const close = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    // Let the exit animation run before the route changes underneath it.
    window.setTimeout(() => router.back(), 220);
  }, [leaving, router]);

  // Escape closes it, and the page underneath doesn't scroll while it's up.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [close]);

  function offsetTo(y: number) {
    if (!panel.current) return;
    panel.current.style.transform = y > 0 ? `translate3d(0, ${y}px, 0)` : "";
  }

  function onPointerDown(event: React.PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Only from the top of the scroll: mid-article, a downward swipe is reading.
    if ((scroller.current?.scrollTop ?? 0) > 0) return;

    drag.current = {
      active: false,
      watching: true,
      startY: event.clientY,
      lastY: event.clientY,
      lastAt: event.timeStamp,
      velocity: 0,
    };
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
      panel.current?.setPointerCapture(event.pointerId);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`fixed inset-0 z-50 ${leaving ? "sheet-leaving" : ""}`}
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ touchAction: "pan-y" }}
      >
        {/* The handle says "this one moves" without a line of text. */}
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <span aria-hidden="true" className="h-1 w-9 rounded-full bg-rule" />
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
