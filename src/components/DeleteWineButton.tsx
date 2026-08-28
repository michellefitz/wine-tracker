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
      <button type="button" onClick={() => setConfirming(true)} className="link-quiet">
        Delete this entry
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-md border-t border-rule pt-7">
      <p className="text-[0.9375rem] text-ink-soft">
        Delete <span className="text-ink">{name}</span> from the log? This can&apos;t be
        undone.
      </p>
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
