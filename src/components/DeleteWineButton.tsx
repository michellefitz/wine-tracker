"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteWineButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/wines/${id}`, { method: "DELETE" });
    if (response.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-muted underline underline-offset-4"
      >
        Delete this entry
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-wine/40 bg-wine/10 p-4">
      <p className="text-sm text-ink">
        Delete <span className="font-medium">{name}</span> from the log? This can&apos;t be
        undone.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={remove} disabled={busy} className="btn-primary flex-1">
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="btn-ghost flex-1"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
