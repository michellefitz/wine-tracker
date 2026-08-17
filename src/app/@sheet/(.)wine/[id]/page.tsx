import { notFound } from "next/navigation";
import Sheet from "@/components/Sheet";
import WineDetail from "@/components/WineDetail";
import { loadWineDetail } from "@/lib/wine-detail";

export const dynamic = "force-dynamic";

/**
 * The bottle, arriving over the shelf rather than instead of it.
 *
 * This intercepts /wine/[id] when it's opened from inside the app, so the list
 * keeps its scroll position and its state and the bottle slides up on top. The
 * URL is the real one throughout: share it, reload it, or open it cold and you
 * get the page underneath this instead.
 */
export default async function WineSheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadWineDetail(id);
  if (!detail) notFound();

  return (
    <Sheet label={detail.wine.name}>
      <WineDetail wine={detail.wine} stored={detail.stored} sheet />
    </Sheet>
  );
}
