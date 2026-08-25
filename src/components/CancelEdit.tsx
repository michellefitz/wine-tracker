"use client";

import { useRouter } from "next/navigation";

/**
 * Out of the form, back to whatever you were editing from.
 *
 * A sheet can't use a link here. `/wine/[id]` from inside the edit sheet is a
 * forward navigation, so it would stack another entry on the history rather
 * than undoing one — and the sheet you came from is still sitting in the slot
 * behind this one. Going back puts it straight back on screen.
 */
export default function CancelEdit() {
  const router = useRouter();

  return (
    <button type="button" onClick={() => router.back()} className="link-quiet">
      Cancel
    </button>
  );
}
