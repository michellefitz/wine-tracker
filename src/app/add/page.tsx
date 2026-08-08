import Link from "next/link";
import AddWineFlow from "@/components/AddWineFlow";

export const metadata = { title: "Log a wine — Cellar Notes" };

export default function AddPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink">
          Log a wine
        </h1>
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          Cancel
        </Link>
      </header>

      <AddWineFlow />
    </main>
  );
}
