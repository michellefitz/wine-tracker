"use client";

import { useState } from "react";

export default function DeleteWineButton({
  id,
  name,
  producer,
  vintage,
}: {
  id: string;
  name: string;
  producer?: string | null;
  vintage?: number | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setFailed(null);

    let response: Response;
    try {
      response = await fetch(`/api/wines/${id}`, { method: "DELETE" });
    } catch {
      setBusy(false);
      setFailed("Couldn't reach the server. The bottle is still here.");
      return;
    }

    // 404 means it's already gone — someone deleted it on another tab, or this
    // is a second tap. Either way the bottle isn't there, so go where we would
    // have gone anyway rather than reporting a failure that isn't one.
    if (!response.ok && response.status !== 404) {
      setBusy(false);
      setFailed("Couldn't delete that. Try again.");
      return;
    }

    /*
     * A full load of the shelf, not a router navigation.
     *
     * Deleting used to be `router.replace("/")` followed by `router.refresh()`,
     * and that put a 404 on screen: refresh refetches whatever the router still
     * thinks the current route is, and one tick after replace() that is still
     * this bottle's own URL. The server rendered it, couldn't find the wine
     * that had just been deleted, and returned its notFound() boundary — so the
     * tree read "This page could not be found" while the address bar said "/".
     *
     * Dropping the refresh fixes the 404 and leaves a worse thing behind: this
     * bottle is usually open in a sheet, and a soft navigation keeps a parallel
     * slot exactly where it was. The sheet stayed up, showing a bottle that no
     * longer exists.
     *
     * So: leave properly. One reload clears the slot, empties every router
     * cache, and re-reads the log from the database — no ordering to get wrong
     * and nothing anywhere that can still be holding the deleted bottle. It
     * costs a page load on the one action in the app that happens rarely, is
     * deliberate, and ends where it started.
     */
    window.location.assign("/");
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="link-quiet">
        Delete this entry
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-md border-t border-rule pt-7">
      <p className="text-[0.9375rem] text-ink-soft">
        {/*
          The space before "from" is written out rather than left as the one
          between the tag and the word. That space does not survive the JSX
          transform — the DOM came out as three nodes, "Delete ", the span, and
          "from the log?", so the sentence read "Delete Barolo Brunatefrom the
          log?" for as long as this has existed. It is the kind of thing that
          reads fine in the source and is only ever visible on screen.

          Producer and vintage are here because the name alone is not an
          identity: with two entries both called Chianti Classico, the sentence
          could not tell you which one you were about to destroy — on the one
          screen in the app where there is no undo.
        */}
        Delete{" "}
        <span className="text-ink">
          {[producer, name, vintage ? String(vintage) : null].filter(Boolean).join(" · ")}
        </span>{" "}
        from the log? This can&apos;t be undone.
      </p>
      {failed && <p className="mt-3 text-[0.9375rem] text-wine">{failed}</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={remove} disabled={busy} className="btn-ink">
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="btn-outline"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
