import { notFound } from "next/navigation";
import WineDetail from "@/components/WineDetail";
import { loadWineDetail } from "@/lib/wine-detail";

export const dynamic = "force-dynamic";

/**
 * The bottle as a page of its own.
 *
 * Reached by opening the link directly, by reloading, or by sharing it — the
 * ordinary route through the app puts this same content in a sheet over the
 * shelf instead. Everything below the address bar is identical either way; see
 * WineDetail for the two things that aren't.
 */
export default async function WinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadWineDetail(id);
  if (!detail) notFound();

  return (
    <main>
      <WineDetail wine={detail.wine} stored={detail.stored} />
    </main>
  );
}
