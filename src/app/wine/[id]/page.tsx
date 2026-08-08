import Link from "next/link";
import { notFound } from "next/navigation";
import BottlePlaceholder from "@/components/BottlePlaceholder";
import DeleteWineButton from "@/components/DeleteWineButton";
import RatingMark from "@/components/RatingMark";
import { tagLabel } from "@/lib/taxonomy";
import { getWine } from "@/lib/wines";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function WinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wine = await getWine(id);
  if (!wine) notFound();

  const facts: [string, string][] = [
    ["Vintage", wine.vintage ? String(wine.vintage) : ""],
    ["Type", wine.wine_type ?? ""],
    ["Grapes", wine.grapes.join(", ")],
    ["Region", [wine.region, wine.country].filter(Boolean).join(", ")],
    ["Bought at", wine.source ?? ""],
    ["Price", wine.price_eur !== null ? `€${wine.price_eur.toFixed(2)}` : ""],
    ["Drank", formatDate(wine.drank_on)],
  ].filter(([, value]) => value !== "") as [string, string][];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-20 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <nav className="mb-7 flex items-center justify-between">
        <Link href="/" className="link-quiet">
          ← All wines
        </Link>
        <Link href={`/wine/${wine.id}/edit`} className="link-quiet">
          Edit
        </Link>
      </nav>

      <div className="mx-auto aspect-4/5 w-full max-w-xs overflow-hidden bg-tint">
        {wine.photo_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${wine.photo_id}`}
            alt={`Label of ${wine.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <BottlePlaceholder />
        )}
      </div>

      <header className="mt-8 text-center">
        {wine.producer && <p className="eyebrow">{wine.producer}</p>}
        <h1 className="mt-2 serif-display text-[2rem] leading-[1.1] tracking-[-0.01em] text-ink">
          {wine.name}
        </h1>
        <div className="mt-4 flex justify-center">
          <RatingMark score={wine.score} size="lg" />
        </div>
      </header>

      {wine.tags.length > 0 && (
        <div className="mt-7 flex flex-wrap justify-center gap-1.5">
          {wine.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-rule px-3 py-1 text-[0.8125rem] text-ink-soft"
            >
              {tagLabel(tag)}
            </span>
          ))}
        </div>
      )}

      {wine.notes && (
        <blockquote className="mx-auto mt-9 max-w-md border-t border-rule pt-7 text-center">
          <p className="serif-text text-[1.375rem] leading-[1.45] text-ink">
            {wine.notes}
          </p>
        </blockquote>
      )}

      <dl className="mx-auto mt-10 max-w-md border-t border-rule">
        {facts.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-6 border-b border-rule py-3.5">
            <dt className="eyebrow pt-0.5">{term}</dt>
            <dd className="text-right text-[0.9375rem] text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 text-center">
        <DeleteWineButton id={wine.id} name={wine.name} />
      </div>
    </main>
  );
}
