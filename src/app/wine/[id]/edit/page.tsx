import { notFound } from "next/navigation";
import WineEditor from "@/components/WineEditor";
import { getWine } from "@/lib/wines";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit — Cellar Notes" };

/**
 * Editing as a page of its own: a direct link, a reload, or a bottle opened
 * cold. Coming at it through the app puts the same form in a sheet instead.
 */
export default async function EditWinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wine = await getWine(id);
  if (!wine) notFound();

  return (
    <main>
      <WineEditor wine={wine} />
    </main>
  );
}
