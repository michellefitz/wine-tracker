import Link from "next/link";
import RatingPill from "@/components/RatingPill";
import { tagLabel } from "@/lib/taxonomy";
import type { Wine } from "@/lib/types";

function subtitle(wine: Wine): string {
  return [wine.producer, wine.vintage, wine.region ?? wine.country]
    .filter(Boolean)
    .join(" · ");
}

export default function WineCard({ wine }: { wine: Wine }) {
  const tags = wine.tags.slice(0, 3);

  return (
    <Link
      href={`/wine/${wine.id}`}
      className="flex gap-3 rounded-2xl border border-line bg-surface p-3 transition
        active:scale-[0.99] hover:border-line/80"
    >
      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {wine.photo_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${wine.photo_id}`}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">
            🍷
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg leading-snug text-ink">
            {wine.name}
          </h2>
          <RatingPill score={wine.score} compact />
        </div>

        {subtitle(wine) && (
          <p className="mt-0.5 truncate text-sm text-muted">{subtitle(wine)}</p>
        )}

        {tags.length > 0 && (
          <p className="mt-1.5 truncate text-xs text-muted/80">
            {tags.map(tagLabel).join(" · ")}
            {wine.tags.length > tags.length && ` +${wine.tags.length - tags.length}`}
          </p>
        )}

        {(wine.source || wine.price_eur !== null) && (
          <p className="mt-1 text-xs text-muted/70">
            {[wine.source, wine.price_eur !== null ? `€${wine.price_eur.toFixed(2)}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}
