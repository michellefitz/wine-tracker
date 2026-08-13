import type { Metadata } from "next";
import Link from "next/link";
import StyleMark from "@/components/StyleMark";
import { groupByStyle, mergeKnownSynonyms, otherSpellings, tallyGrapes } from "@/lib/grapes";
import { withFoundGrapes } from "@/lib/wine-facts";
import { listWines } from "@/lib/wines";
import type { Wine } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grapes · Cellar Notes",
};

/** "4 bottles · 3 you liked" — your record with this grape, in one line. */
function record(count: number, liked: number, disliked: number): string {
  const bottles = `${count} ${count === 1 ? "bottle" : "bottles"}`;
  if (liked > 0 && disliked > 0) return `${bottles} · ${liked} liked, ${disliked} not`;
  if (liked > 0) return `${bottles} · ${liked} you liked`;
  if (disliked > 0) return `${bottles} · none you liked yet`;
  return bottles;
}

export default async function GrapesPage() {
  let wines: Wine[] = [];
  let loadError: string | null = null;

  try {
    // Through withFoundGrapes, so a bottle whose grapes came from the web is
    // counted the same as one you typed them into.
    wines = await withFoundGrapes(await listWines());
  } catch (error) {
    console.error("grapes: could not load wines:", error);
    loadError = "Couldn't reach the database.";
  }

  let grapes = tallyGrapes(wines);
  try {
    grapes = await mergeKnownSynonyms(grapes);
  } catch (error) {
    // Worth showing unmerged; it only costs you two rows for one grape.
    console.error("grapes: could not fold synonyms together:", error);
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-20 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <nav className="mb-9 flex items-center justify-between">
        <Link href="/" className="link-quiet">
          ← All wines
        </Link>
        <Link href="/labels" className="link-quiet">
          Labels
        </Link>
      </nav>

      <header>
        <h1 className="display text-[1.75rem] leading-[1.1] text-ink">Grapes</h1>
        <p className="essay mt-3 max-w-md text-[1.0625rem] leading-relaxed text-muted">
          Every variety you&apos;ve logged, grouped by what you drank it as and
          most-drunk first. Tap one to read what it&apos;s like — how sharp, how
          full-bodied, what it tastes of, and where it grows.
        </p>
      </header>

      {loadError ? (
        <p className="mt-8 border border-rule bg-card p-5 text-[0.9375rem] text-wine">
          {loadError}
        </p>
      ) : grapes.length === 0 ? (
        <p className="mt-10 border-t border-rule py-16 text-center text-[0.9375rem] leading-relaxed text-muted">
          Nothing yet. Log a bottle with its grape on it and it&apos;ll appear here.
        </p>
      ) : (
        groupByStyle(grapes).map(({ style, grapes: inStyle }) => (
          <section key={style ?? "untyped"} className="mt-9">
            <h2 className="eyebrow flex items-center gap-2">
              {style && <StyleMark style={style} />}
              {style ?? "Not typed yet"}
            </h2>
            <ul className="mt-3 border-t border-rule">
              {inStyle.map((grape) => (
                <li key={grape.key}>
                  <Link
                    href={`/grape/${grape.slug}`}
                    className="flex items-baseline justify-between gap-5 border-b border-rule
                      py-4 transition-colors hover:bg-tint/50"
                  >
                    <span>
                      <span className="essay text-[1.125rem] leading-snug text-ink">
                        {grape.label}
                      </span>
                      {otherSpellings(grape).length > 0 && (
                        <span className="mt-0.5 block text-[0.75rem] text-muted">
                          you also logged it as {otherSpellings(grape).join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[0.8125rem] text-muted">
                      {record(grape.count, grape.liked, grape.disliked)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
