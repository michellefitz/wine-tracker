import Link from "next/link";
import BottlePlaceholder from "@/components/BottlePlaceholder";
import RatingMark from "@/components/RatingMark";
import type { Wine } from "@/lib/types";

export default function WineCard({ wine }: { wine: Wine }) {
  const place = [wine.region, wine.country].filter(Boolean)[0];

  return (
    <Link href={`/wine/${wine.id}`} className="group block">
      <div className="aspect-4/5 w-full overflow-hidden bg-tint">
        {wine.photo_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${wine.photo_id}`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500
              group-hover:scale-[1.03]"
          />
        ) : (
          <BottlePlaceholder />
        )}
      </div>

      <div className="pt-3">
        <RatingMark score={wine.score} />
        <h2 className="mt-1.5 serif-display text-[1.0625rem] leading-tight text-ink">
          {wine.name}
        </h2>
        {(wine.producer || place) && (
          <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
            {wine.producer ?? place}
            {wine.vintage ? ` · ${wine.vintage}` : ""}
          </p>
        )}
      </div>
    </Link>
  );
}
