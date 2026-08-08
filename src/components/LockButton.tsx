"use client";

import { useRouter } from "next/navigation";

export default function LockButton() {
  const router = useRouter();

  async function lock() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={lock}
      className="text-xs text-muted underline underline-offset-4"
    >
      Lock
    </button>
  );
}
