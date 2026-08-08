"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't sign in.");
        setBusy(false);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="eyebrow mb-2 block text-center" htmlFor="passcode">
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          className="field text-center text-[1.25rem] tracking-[0.3em]"
          autoComplete="current-password"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          autoFocus
        />
      </div>

      {error && <p className="text-center text-[0.875rem] text-wine">{error}</p>}

      <button type="submit" className="btn-ink w-full" disabled={busy || !passcode}>
        {busy ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
