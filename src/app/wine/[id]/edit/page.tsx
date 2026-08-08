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
    <main className="mx-auto min-h-dvh w-full max-w-xl px-5 pb-10 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <header className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">Editing</p>
          <Link href={`/wine/${wine.id}`} className="link-quiet">
            Cancel
          </Link>
        </div>
        <h1 className="mt-3 serif-display text-[2rem] leading-tight tracking-[-0.01em] text-ink">
          {wine.name}
        </h1>
      </header>

      <WineForm mode="edit" wine={wine} />
    </main>
  );
}
