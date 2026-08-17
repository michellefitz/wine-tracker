import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GrapeDetail from "@/components/GrapeDetail";
import { prettifyKey, slugToKey } from "@/lib/grapes";

export const dynamic = "force-dynamic";

/**
 * Writing a profile takes longer than Vercel's default function budget, and a
 * killed function looks exactly like a failed API call. Same 60s the label
 * reader gets. Only the first view of a grape needs it; after that it's a
 * single row out of Postgres.
 */
export const maxDuration = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${prettifyKey(slugToKey(decodeURIComponent(slug)))} · Cellar Notes` };
}

/** The grape as a page of its own — a direct link, a reload, or a share. */
export default async function GrapePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const askedKey = slugToKey(decodeURIComponent(slug));
  if (!askedKey) notFound();

  return (
    <main>
      <div className="mx-auto w-full max-w-3xl px-5 pt-[max(1.75rem,env(safe-area-inset-top))]">
        <nav className="mb-9 flex items-center justify-between">
          <Link href="/" className="link-quiet">
            ← All wines
          </Link>
          <Link href="/grapes" className="link-quiet">
            Grapes
          </Link>
        </nav>
      </div>
      <GrapeDetail askedKey={askedKey} />
    </main>
  );
}
