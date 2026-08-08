import { ratingFor } from "@/lib/taxonomy";

const TONE: Record<number, string> = {
  2: "bg-sage/20 text-sage border-sage/40",
  1: "bg-sage/10 text-sage/90 border-sage/25",
  [-1]: "bg-wine/15 text-wine-soft border-wine/35",
  [-2]: "bg-wine/25 text-wine-soft border-wine/50",
};

export default function RatingPill({ score, compact }: { score: number; compact?: boolean }) {
  const rating = ratingFor(score);
  if (!rating) return null;

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[score] ?? ""}`}
    >
      {compact ? rating.short : `${rating.emoji} ${rating.label}`}
    </span>
  );
}
