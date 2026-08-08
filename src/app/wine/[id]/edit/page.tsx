import Link from "next/link";
import { notFound } from "next/navigation";
import WineForm from "@/components/WineForm";
import { getWine } from "@/lib/wines";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit — Cellar Notes" };

export default async function EditWinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wine = await getWine(id);
  if (!wine) notFound();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink">Edit</h1>
        <Link
          href={`/wine/${wine.id}`}
          className="text-sm text-muted underline underline-offset-4"
        >
          Cancel
        </Link>
      </header>

      <WineForm mode="edit" wine={wine} />
    </main>
  );
}
