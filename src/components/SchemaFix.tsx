"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The one error in this app you can do something about, with the something
 * attached.
 *
 * A deploy can add a column, and until the database has it the app quietly
 * can't save — which shows up as a page that looks like it's working and
 * silently forgets everything, over and over. The message used to end "run
 * `npm run db:init`", which assumes a laptop and a checkout. This is a wine
 * log, used on a phone, in a shop. The instruction was unfollowable exactly
 * when it mattered.
 *
 * The statements behind the button only ever create things — no statement in
 * the list drops a column or a table — so pressing it can add what's missing
 * and can't take anything away.
 */
export default function SchemaFix({ message }: { message: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function bringUpToDate() {
    setBusy(true);
    setFailed(null);
    try {
      const response = await fetch("/api/db/migrate", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        failed?: { error: string }[];
      };
      if (body.ok) {
        setDone(true);
        // The page was rendered from a database that couldn't answer properly.
        router.refresh();
      } else {
        setFailed(body.failed?.[0]?.error ?? "The database refused the changes.");
      }
    } catch {
      setFailed("Couldn't reach the server.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <p className="mt-6 text-[0.8125rem] leading-relaxed text-muted">
        Database brought up to date. Press Refresh above to look this bottle up
        again — it&apos;ll stick this time.
      </p>
    );
  }

  return (
    <div className="mt-6 border border-rule bg-card p-4">
      <p className="text-[0.8125rem] leading-relaxed text-wine">{message}</p>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
        Nothing is being kept until that&apos;s fixed, which is why this bottle
        keeps looking itself up. The button adds what&apos;s missing; it
        can&apos;t remove anything.
      </p>
      {failed && <p className="mt-2 text-[0.8125rem] leading-relaxed text-wine">{failed}</p>}
      <button
        type="button"
        onClick={bringUpToDate}
        disabled={busy}
        className="btn-ink mt-4 w-full"
      >
        {busy ? "Updating…" : "Bring the database up to date"}
      </button>
    </div>
  );
}
