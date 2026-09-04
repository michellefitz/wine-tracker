"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ServingGuide from "@/components/ServingGuide";
import type { GrapeStyle } from "@/lib/grapes";
import type { Serving } from "@/lib/serving";
import type { ServingNote } from "@/lib/serving-note";

/**
 * How to serve this one, written for this one where possible.
 *
 * The rules in serving.ts arrive with the page and are always right; the
 * written note is shorter and specific to the bottle, and it wins. What this
 * adds is the way a bottle gets one at all when it hasn't got one — a short
 * request on view, not a thirty-five-second web search.
 *
 * That mattered more than it looked. Notes started life as one field of the
 * lookup, so a bottle filed before they existed, or one whose note failed
 * while the rest of the lookup succeeded, had no route back to a note except
 * searching for the whole bottle again. Pressing Refresh looked like it did
 * nothing, because the section it should have changed is the one thing Refresh
 * couldn't reach.
 *
 * Once per bottle: it's stored the moment it's written, and a failure is
 * reported rather than retried in a loop.
 */
export default function ServingSection({
  wineId,
  byRule,
  written,
  stale,
  mark = null,
}: {
  wineId: string;
  /** What the rules say. Null only when the bottle has no type to go on. */
  byRule: Serving | null;
  /** What's on file, if a note has been written for this bottle. */
  written: ServingNote | null;
  /**
   * True when there's no note, or the one on file was written by a prompt
   * we've since improved on. Worked out on the server, where the current
   * version lives.
   */
  stale: boolean;
  mark?: GrapeStyle | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState<ServingNote | null>(written);
  const [trouble, setTrouble] = useState<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    /*
     * Asked for once per mount, and only when there's something to gain: no
     * note at all, or one written by an older prompt. The old note stays on
     * screen while the new one is being written — swapping it for the rules
     * first would be a step backwards you'd watch happen.
     */
    if (!stale || asked.current) return;
    asked.current = true;

    let live = true;
    (async () => {
      try {
        const response = await fetch(`/api/wines/${wineId}/serving`, { method: "POST" });
        const body = (await response.json().catch(() => ({}))) as {
          serving?: ServingNote | null;
          reason?: string;
          stored?: boolean;
        };
        if (!live) return;

        if (body.serving) {
          setNote(body.serving);
          // Stored server-side, so the next visit has it without asking. The
          // refresh is what stops this page disagreeing with the database.
          if (body.stored !== false) router.refresh();
        } else {
          setTrouble(body.reason ?? "No note came back.");
        }
      } catch {
        if (live) setTrouble("Couldn't reach the server to write one.");
      }
    })();

    return () => {
      live = false;
    };
  }, [stale, wineId, router]);

  if (!byRule) return null;

  return (
    <>
      <ServingGuide serving={note ? merged(byRule, note) : byRule} mark={mark} />
      {/*
        Quiet, and only when something actually went wrong. The rules above are
        a real answer, so this is a footnote about why they aren't the shorter
        one — not an error the page has to apologise for.
      */}
      {trouble && (
        <p className="mx-auto mt-2 max-w-md text-[0.8125rem] leading-relaxed text-muted">
          Couldn&apos;t write a note for this bottle: {trouble}
        </p>
      )}
    </>
  );
}

/**
 * The written lines over the rule-written ones, minus the bookkeeping — the
 * version belongs in the database, not in a heading on the page.
 */
function merged(byRule: Serving, note: ServingNote): Serving {
  const { version, ...lines } = note;
  void version;
  return { ...byRule, ...lines };
}
