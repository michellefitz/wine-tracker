import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import GrapeProfileView from "@/components/GrapeProfileView";
import { getGrapeProfile, prettifyKey, profileKeys, slugToKey, winesWithGrape } from "@/lib/grapes";
import { withFoundGrapes } from "@/lib/wine-facts";
import { listWines } from "@/lib/wines";
import type { Wine } from "@/lib/types";

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

/**
 * A profile that isn't cached yet takes a few seconds to write, so the page
 * shell and this outline stream first. It mirrors the real layout rather than
 * spinning: you can see what's coming, and the name you tapped is already there.
 */
function Outline({ name }: { name: string }) {
  return (
    <div className="animate-pulse">
      <header className="text-center">
        <h1 className="essay text-[1.875rem] leading-[1.15] text-ink">{name}</h1>
        <p className="mt-3 text-[0.8125rem] text-muted">Reading up on this grape…</p>
      </header>

      <div className="mx-auto mt-8 max-w-md space-y-2.5">
        <span className="block h-3.5 w-full bg-tint" />
        <span className="block h-3.5 w-full bg-tint" />
        <span className="block h-3.5 w-3/5 bg-tint" />
      </div>

      <div className="mx-auto mt-10 max-w-md border-t border-rule">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="border-b border-rule py-4">
            <div className="flex justify-between gap-4">
              <span className="block h-2.5 w-16 bg-tint" />
              <span className="block h-2.5 w-12 bg-tint" />
            </div>
            <div className="mt-2.5 flex gap-1">
              {[1, 2, 3, 4, 5].map((step) => (
                <span key={step} className="h-[3px] flex-1 bg-rule" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="essay text-[1.75rem] leading-[1.15] text-ink">{title}</h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

/** Kept off the critical path: a wine list you can't load shouldn't lose you the notes. */
async function loadWines(): Promise<Wine[]> {
  try {
    // Same merge as the grape index: "your bottles of this grape" has to mean
    // the same thing on both pages.
    return await withFoundGrapes(await listWines());
  } catch (error) {
    console.error("grape: could not load your wines:", error);
    return [];
  }
}

async function GrapeBody({ askedKey }: { askedKey: string }) {
  const [lookup, wines] = await Promise.all([getGrapeProfile(askedKey), loadWines()]);

  if (lookup.status === "unknown") {
    return (
      <Message
        title={prettifyKey(askedKey)}
        body={
          lookup.note ??
          "That doesn't look like a grape variety — it might be a blend name, a region, or a typo on the bottle. Edit the wine and try the variety on its own."
        }
      />
    );
  }

  if (lookup.status === "unavailable") {
    return <Message title={prettifyKey(askedKey)} body={lookup.message} />;
  }

  return (
    <GrapeProfileView
      profile={lookup.profile}
      yourWines={winesWithGrape(wines, profileKeys(lookup.profile, askedKey))}
      warning={lookup.warning}
    />
  );
}

export default async function GrapePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const askedKey = slugToKey(decodeURIComponent(slug));
  if (!askedKey) notFound();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-20 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <nav className="mb-9 flex items-center justify-between">
        <Link href="/" className="link-quiet">
          ← All wines
        </Link>
        <Link href="/grapes" className="link-quiet">
          Grapes
        </Link>
      </nav>

      <Suspense fallback={<Outline name={prettifyKey(askedKey)} />}>
        <GrapeBody askedKey={askedKey} />
      </Suspense>
    </main>
  );
}
