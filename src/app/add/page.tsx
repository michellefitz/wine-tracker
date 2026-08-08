import Link from "next/link";
import AddWineFlow from "@/components/AddWineFlow";

export const metadata = { title: "Log a wine — Cellar Notes" };

export default function AddPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-5 pb-10 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <header className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">New entry</p>
          <Link href="/" className="link-quiet">
            Cancel
          </Link>
        </div>
        <h1 className="mt-3 font-display text-[2rem] leading-tight tracking-[-0.01em] text-ink">
          Log a wine
        </h1>
      </header>

      <AddWineFlow />
    </main>
  );
}
