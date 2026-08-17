import { notFound } from "next/navigation";
import { Suspense } from "react";
import Sheet from "@/components/Sheet";
import SheetSkeleton from "@/components/SheetSkeleton";
import WineDetail from "@/components/WineDetail";
import { loadWineDetail } from "@/lib/wine-detail";

export const dynamic = "force-dynamic";

async function Bottle({ id }: { id: string }) {
  const detail = await loadWineDetail(id);
  if (!detail) notFound();

  return <WineDetail wine={detail.wine} stored={detail.stored} sheet />;
}

/**
 * The bottle, arriving over the shelf rather than instead of it.
 *
 * This intercepts /wine/[id] when it's opened from inside the app, so the list
 * keeps its scroll position and its state and the bottle slides up on top. The
 * URL is the real one throughout: share it, reload it, or open it cold and you
 * get the page underneath this instead.
 *
 * The sheet itself is outside the Suspense boundary on purpose. Awaiting the
 * bottle here would mean the sheet couldn't start moving until the database had
 * answered — a tap that does nothing, then everything at once. It flies up on
 * the tap now and the bottle streams into it.
 */
export default async function WineSheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Sheet label="Bottle">
      <Suspense fallback={<SheetSkeleton />}>
        <Bottle id={id} />
      </Suspense>
    </Sheet>
  );
}
