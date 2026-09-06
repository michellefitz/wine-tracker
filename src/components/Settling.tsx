"use client";

import { useEffect, useState } from "react";

/**
 * The bottle taking the skeleton's place, rather than appearing after it.
 *
 * Fading the arriving page in on its own looked worse than it sounds. The
 * skeleton is removed the instant the content exists, so what fades in is
 * fading in over bare paper: for about a sixth of a second the whole sheet —
 * the photograph as much as the writing — is a washed-out grey ghost of
 * itself. Measured mid-swap it was at 48% over nothing, and the bottle was by
 * then fully loaded and perfectly sharp. It was being made pale for no reason
 * at all.
 *
 * The skeleton is pixel-aligned with what replaces it, which makes a proper
 * dissolve available: keep a copy of it on top and take it away as the content
 * comes up. Every grey bar turns into the writing that belongs in its place
 * and the grey box turns into the bottle, all without either of them passing
 * through a state where the sheet looks half-empty.
 *
 * The copy is needed because Suspense doesn't overlap: the loading file's tree
 * is gone before this one exists, so the only way to have both on screen is to
 * bring one's own.
 */

/** Long enough to read as a dissolve, short enough not to be a wait. */
const CROSSFADE_MS = 260;

export default function Settling({
  children,
  placeholder,
}: {
  children: React.ReactNode;
  /** The same skeleton the loading file showed, to hand over from. */
  placeholder: React.ReactNode;
}) {
  const [handedOver, setHandedOver] = useState(false);

  useEffect(() => {
    const done = window.setTimeout(() => setHandedOver(true), CROSSFADE_MS);
    return () => window.clearTimeout(done);
  }, []);

  return (
    <div className="relative">
      {!handedOver && (
        <div className="settling-out pointer-events-none absolute inset-x-0 top-0" aria-hidden="true">
          {placeholder}
        </div>
      )}
      <div className="settling-in">{children}</div>
    </div>
  );
}
