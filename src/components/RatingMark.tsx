import { ratingFor } from "@/lib/taxonomy";

/**
 * A dot and a word. Wines you liked take the accent colour and the ones you
 * didn't stay grey, so a page of cards sorts itself visually before you read
 * a single label — the gallery convention where a red dot beside a work
 * means it found a buyer.
 */
export default function RatingMark({
  score,
  size = "sm",
}: {
  score: number;
  size?: "sm" | "lg";
}) {
  const rating = ratingFor(score);
  if (!rating) return null;

  const dot = rating.liked ? "border-wine" : "border-muted";
  const fill = rating.solid ? (rating.liked ? "bg-wine" : "bg-muted") : "bg-transparent";
  const text = rating.liked ? "text-wine" : "text-muted";

  return (
    <span className={`inline-flex items-center gap-1.5 ${text}`}>
      <span
        aria-hidden
        className={`inline-block shrink-0 rounded-full border ${dot} ${fill} ${
          size === "lg" ? "size-2.5" : "size-[7px]"
        }`}
      />
      <span
        className={
          size === "lg"
            ? "text-[0.75rem] font-medium uppercase tracking-[0.16em]"
            : "text-[0.6875rem] font-medium uppercase tracking-[0.14em]"
        }
      >
        {size === "lg" ? rating.label : rating.short}
      </span>
    </span>
  );
}
