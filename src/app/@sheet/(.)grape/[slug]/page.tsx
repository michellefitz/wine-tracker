import { notFound } from "next/navigation";
import GrapeDetail from "@/components/GrapeDetail";
import Sheet from "@/components/Sheet";
import { prettifyKey, slugToKey } from "@/lib/grapes";

export const dynamic = "force-dynamic";

/** Same 60s as the page: the first view of a grape has to write it first. */
export const maxDuration = 60;

/** The grape, arriving over whatever you were reading. */
export default async function GrapeSheet({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const askedKey = slugToKey(decodeURIComponent(slug));
  if (!askedKey) notFound();

  return (
    <Sheet label={prettifyKey(askedKey)}>
      <GrapeDetail askedKey={askedKey} sheet />
    </Sheet>
  );
}
