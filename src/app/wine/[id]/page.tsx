import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteWineButton from "@/components/DeleteWineButton";
import RatingPill from "@/components/RatingPill";
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
    ["Producer", wine.producer ?? ""],
    ["Vintage", wine.vintage ? String(wine.vintage) : ""],
    ["Type", wine.wine_type ?? ""],
    ["Grapes", wine.grapes.join(", ")],
    ["Region", [wine.region, wine.country].filter(Boolean).join(", ")],
    ["Bought at", wine.source ?? ""],
    ["Price", wine.price_eur !== null ? `€${wine.price_eur.toFixed(2)}` : ""],
    ["Drank", formatDate(wine.drank_on)],
  ];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          ← All wines
        </Link>
        <Link
          href={`/wine/${wine.id}/edit`}
          className="text-sm text-muted underline underline-offset-4"
        >
          Edit
        </Link>
      </header>

      <div className="flex gap-4">
        {wine.photo_id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${wine.photo_id}`}
            alt={`Label of ${wine.name}`}
            className="h-40 w-32 shrink-0 rounded-xl border border-line object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-ink">
            {wine.name}
          </h1>
          {wine.producer && <p className="mt-1 text-muted">{wine.producer}</p>}
          <div className="mt-3">
            <RatingPill score={wine.score} />
          </div>
        </div>
      </div>

      {wine.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {wine.tags.map((tag) => (
            <span key={tag} className="chip chip-on">
              {tagLabel(tag)}
            </span>
          ))}
        </div>
      )}

      {wine.notes && (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <h2 className="label">Notes</h2>
          <p className="whitespace-pre-wrap text-ink">{wine.notes}</p>
        </section>
      )}

      <dl className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface px-4">
        {facts
          .filter(([, value]) => value !== "")
          .map(([term, value]) => (
            <div key={term} className="flex justify-between gap-4 py-3 text-sm">
              <dt className="text-muted">{term}</dt>
              <dd className="text-right text-ink">{value}</dd>
            </div>
          ))}
      </dl>

      <div className="mt-8">
        <DeleteWineButton id={wine.id} name={wine.name} />
      </div>
    </main>
  );
}
