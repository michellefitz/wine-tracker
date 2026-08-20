import Link from "next/link";
import LabelPhoto from "@/components/LabelPhoto";
import RatingMark from "@/components/RatingMark";
import { countryFlag, placeLine } from "@/lib/places";
import type { Wine } from "@/lib/types";

export default function WineCard({ wine }: { wine: Wine }) {
  const flag = countryFlag(wine.country);
  // Cards are half a phone wide, so "Marlborough, New Zealand" truncates badly.
  // When the flag is there to carry the country, the region alone is enough.
  const place = flag
    ? wine.region?.trim() || wine.country?.trim() || null
    : placeLine(wine.region, wine.country);

  return (
    <Link
      href={`/wine/${wine.id}`}
      className="group block transition-transform duration-[160ms] ease-out-strong
        active:scale-[0.985]"
    >
      <div className="aspect-4/5 w-full overflow-hidden bg-tint">
        {/* 560px covers a 167 CSS px card at a phone's 3x density. */}
        <LabelPhoto
          photoId={wine.photo_id}
          alt=""
          width={560}
          className="h-full w-full object-cover transition-transform duration-200
            ease-out-strong group-hover:scale-[1.03]"
        />
      </div>

      <div className="pt-3">
        <RatingMark score={wine.score} />
        <h2 className="essay mt-1.5 text-[1.0625rem] leading-snug text-ink">
          {wine.name}
        </h2>
        {(wine.producer || wine.vintage) && (
          <p className="mt-1 truncate text-[0.8125rem] text-ink-soft">
            {[wine.producer, wine.vintage].filter(Boolean).join(", ")}
          </p>
        )}
        {place && (
          <p className="mt-0.5 flex items-baseline gap-1.5 text-[0.8125rem] text-muted">
            {flag && (
              <span aria-hidden="true" className="shrink-0 leading-none">
                {flag}
              </span>
            )}
            <span className="truncate">{place}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
