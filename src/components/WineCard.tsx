import Link from "next/link";
import LabelPhoto from "@/components/LabelPhoto";
import RatingMark from "@/components/RatingMark";
import { countryFlag, placeLine } from "@/lib/places";
import type { Wine } from "@/lib/types";

/**
 * `heading` exists so a card can sit under a heading of its own.
 *
 * On the grid and the grape pages the wine's name is the first heading on that
 * stretch of page, so h2 is right. In a shop it sits under "Red" or "White",
 * and leaving it at h2 would put the section and the bottles inside it at the
 * same level — a list of eight equal headings where there are really three
 * sections with bottles in them. The class list doesn't change; only the tag.
 */
export default function WineCard({
  wine,
  heading: Title = "h2",
}: {
  wine: Wine;
  heading?: "h2" | "h3";
}) {
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
        active:scale-[0.975]"
    >
      <div className="photo-bleed relative aspect-4/5 w-full overflow-hidden bg-tint">
        {/* 560px covers a 167 CSS px card at a phone's 3x density. */}
        <LabelPhoto
          photoId={wine.photo_id}
          alt=""
          width={560}
          className="h-full w-full object-cover transition-transform duration-200
            ease-out-strong pointer-hover:group-hover:scale-[1.03]"
        />
      </div>

      <div className="pt-3">
        <RatingMark score={wine.score} />
        <Title className="essay mt-1.5 text-[1.0625rem] leading-snug text-ink">
          {wine.name}
        </Title>
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
