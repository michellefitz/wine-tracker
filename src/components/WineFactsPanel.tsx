"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PouringGlass } from "@/components/Loaders";
import WineFactsView from "@/components/WineFactsView";
import type { StoredFacts } from "@/lib/wine-facts";

/**
 * Owns everything about the lookup on the client.
 *
 * The first version did this during the page render, inside a streamed
 * Suspense boundary. When a search overran the function budget the server was
 * killed mid-response and the browser was left holding half a document — a
 * skeleton that never resolved, then "this page couldn't load". A long job
 * doesn't belong in a page render: the page now ships what's already stored,
 * and anything slow happens here, where waiting and failing are both visible
 * and neither can take the page down with it.
 */
export default function WineFactsPanel({
  wineId,
  initial,
  query = "",
}: {
  wineId: string;
  initial: StoredFacts | null;
  /** The bottle as you logged it, so a review can link to its site's search. */
  query?: string;
}) {
  const router = useRouter();
  const [facts, setFacts] = useState<StoredFacts | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const started = useRef(false);

  async function look() {
    setBusy(true);
    setError(null);

    // Longer than the server gives itself, so this only fires when the request
    // never came back at all — and when it does, say that rather than blaming
    // the connection.
    const giveUp = AbortSignal.timeout(75_000);

    try {
      const response = await fetch(`/api/wines/${wineId}/facts`, {
        method: "POST",
        signal: giveUp,
      });
      const body = (await response.json().catch(() => ({}))) as {
        facts?: StoredFacts;
        warning?: string | null;
        error?: string;
      };
      if (!response.ok || !body.facts) {
        setError(body.error ?? "Couldn't look this bottle up.");
        return;
      }
      setFacts(body.facts);
      setWarning(body.warning ?? null);
      // The wine's own table shows looked-up values too, and it's server-rendered.
      router.refresh();
    } catch {
      setError(
        giveUp.aborted
          ? "The search took too long and never came back. Try Refresh."
          : "Lost the connection while searching.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Look it up the first time you open a bottle, then never again unless asked.
  useEffect(() => {
    if (initial || started.current) return;
    started.current = true;
    void look();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <section className="mx-auto mt-9 max-w-md border-t border-rule pt-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="eyebrow">About this bottle</h2>
        <button
          type="button"
          onClick={look}
          disabled={busy}
          className="link-quiet shrink-0 disabled:opacity-50"
        >
          {busy ? "Searching…" : facts || error ? "Refresh" : "Look it up"}
        </button>
      </div>

      {/*
        Every wait, not just the first one. Guarding this on `!facts` meant a
        Refresh on a bottle that already had something on file hid the old
        content and showed nothing in its place — the one lookup you actually
        sit and watch was the one with no sign of life in it.
      */}
      {busy && (
        <div className="py-2">
          <PouringGlass caption={facts ? "Searching again…" : "Searching the web…"} />
          <p className="mt-2 text-center text-[0.8125rem] text-muted">
            This takes a few seconds.
          </p>
        </div>
      )}

      {/* A failed refresh sits above what was found last time, so say so. */}
      {error && !busy && (
        <p className={`text-[0.9375rem] leading-relaxed text-wine ${facts ? "mb-5" : ""}`}>
          {error}
          {facts && " What's below is the last result."}
        </p>
      )}

      {facts && !busy && <WineFactsView facts={facts} query={query} warning={warning} />}
    </section>
  );
}
