"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Searches this bottle again, ignoring whatever is on file.
 *
 * Mostly a development tool: as the lookup gets better, this is how a bottle
 * logged months ago picks up the improvement without being re-entered.
 */
export default function RefreshFactsButton({ wineId }: { wineId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/wines/${wineId}/facts`, { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't look that up.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex shrink-0 items-baseline gap-3">
      {error && <span className="text-[0.75rem] text-wine">{error}</span>}
      <button type="button" onClick={onClick} disabled={busy} className="link-quiet disabled:opacity-50">
        {busy ? "Looking…" : "Refresh"}
      </button>
    </span>
  );
}
