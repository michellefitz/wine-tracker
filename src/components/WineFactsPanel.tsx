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
  /** Mirrors `busy` for the listeners below, which outlive any one render. */
  const busyRef = useRef(false);
  const leftMidSearch = useRef(false);
  busyRef.current = busy;

  /** What's already written down — one row, no searching. */
  async function stored(): Promise<StoredFacts | null> {
    try {
      const response = await fetch(`/api/wines/${wineId}/facts`);
      if (!response.ok) return null;
      const body = (await response.json()) as { facts?: StoredFacts | null };
      return body.facts ?? null;
    } catch {
      return null;
    }
  }

  async function look() {
    setBusy(true);
    setError(null);

    /*
     * AbortController rather than AbortSignal.timeout, and everything inside
     * the try. The timeout helper needs iOS 16.4, and it was being called
     * before the try — so on an older phone it threw before the request went
     * out, the finally never ran, and the panel sat on "Searching the web"
     * with no error and no way back. A convenience that can strand the screen
     * isn't a convenience.
     */
    const controller = new AbortController();
    let expired = false;
    let timer = 0;

    try {
      // Longer than the server's own ceiling, so the server's error wins and
      // this only fires when the request never came back at all.
      timer = window.setTimeout(() => {
        expired = true;
        controller.abort();
      }, 70_000);

      const response = await fetch(`/api/wines/${wineId}/facts`, {
        method: "POST",
        signal: controller.signal,
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
        expired
          ? "The search took too long and never came back. Try Refresh."
          : "Lost the connection while searching.",
      );
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
    }
  }

  /*
   * Look it up the first time you open a bottle, then never again unless asked.
   *
   * Asking what's on file first isn't wasted: a search started on a previous
   * visit runs to completion on the server whether or not you stayed to watch,
   * so by the time you come back the answer is often already written down.
   * Without this check, coming back started the same search over again.
   */
  useEffect(() => {
    if (initial || started.current) return;
    started.current = true;

    void (async () => {
      const already = await stored();
      if (already) {
        setFacts(already);
        router.refresh();
        return;
      }
      await look();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  /*
   * Coming back to the app, in the two states that need it.
   *
   * A search outlives the screen that started it, so the answer is often
   * already written down by the time you return — that's the easy half.
   *
   * The hard half is that iOS freezes a backgrounded page, timers included. A
   * request that was in flight when you left can simply never settle: it
   * neither resolves nor rejects, the abort timer never fires, and `busy`
   * stays true for good. This listener used to begin `if (busy) return`, which
   * switched off the only thing that could have rescued it — so the panel sat
   * on "Searching the web" until the app was force-quit. Being busy is now the
   * reason to look, not the reason not to.
   */
  useEffect(() => {
    async function collect() {
      if (document.visibilityState !== "visible") return;

      const wasAway = leftMidSearch.current;
      leftMidSearch.current = false;

      // Nothing to collect: we already have an answer and aren't waiting.
      if (!busyRef.current && facts && !error) return;

      const already = await stored();
      if (already) {
        setFacts(already);
        setError(null);
        setBusy(false);
        router.refresh();
        return;
      }

      // Still waiting, and we were away while it ran. Give it a moment to
      // prove it's alive, then let go rather than spin for ever.
      if (busyRef.current && wasAway) {
        window.setTimeout(() => {
          if (!busyRef.current) return;
          setBusy(false);
          setError("That search stopped when the app went to the background. Try Refresh.");
        }, 2500);
      }
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        if (busyRef.current) leftMidSearch.current = true;
        return;
      }
      void collect();
    }

    function onFocus() {
      void collect();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, facts, error]);

  return (
    <section className="mx-auto mt-9 max-w-md">
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
