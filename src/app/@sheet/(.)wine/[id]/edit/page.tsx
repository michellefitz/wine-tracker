import { notFound } from "next/navigation";
import { Suspense } from "react";
import FormSkeleton from "@/components/FormSkeleton";
import Sheet from "@/components/Sheet";
import WineEditor from "@/components/WineEditor";
import { getWine } from "@/lib/wines";

export const dynamic = "force-dynamic";

async function Editor({ id }: { id: string }) {
  const wine = await getWine(id);
  if (!wine) notFound();

  return <WineEditor wine={wine} sheet />;
}

/**
 * Editing, over the bottle rather than underneath it.
 *
 * Without this the Edit link inside a bottle sheet went to the page route,
 * which rendered behind the sheet that was still covering the screen: the form
 * was loaded, focused and completely unreachable, and dismissing the sheet went
 * back past it to the shelf. Intercepting it keeps the whole path in one place
 * — shelf, bottle, form, and back out the way you came.
 *
 * Dismissal is handle-only here. On a form, a downward swipe over a field is
 * usually a thumb that missed, and there's nothing behind this to undo it with.
 */
export default async function EditWineSheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Sheet label="Edit bottle" dismiss="handle">
      <Suspense fallback={<FormSkeleton />}>
        <Editor id={id} />
      </Suspense>
    </Sheet>
  );
}
