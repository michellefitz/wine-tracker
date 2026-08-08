import { type GrapeScale, scaleLevelWord } from "@/lib/taxonomy";

/**
 * One axis of a grape, as a five-step meter.
 *
 * The point of a fixed scale is comparison: Sauvignon Blanc's acidity only
 * means something next to Chardonnay's, and that only works if every grape is
 * drawn the same way. So the geometry never varies with the value — five
 * segments, always, filled from the left.
 *
 * Ink rather than the bordeaux accent on purpose: in this app the accent means
 * "you liked it", and a grape's acidity is a fact, not a verdict.
 */
export default function ScaleMeter({
  scale,
  value,
  showHint = true,
}: {
  scale: GrapeScale;
  value: number | null;
  showHint?: boolean;
}) {
  const word = scaleLevelWord(scale, value);
  if (!word || value === null) return null;

  return (
    <div className="border-b border-rule py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="eyebrow">{scale.label}</span>
        <span className="text-[0.9375rem] text-ink">{word}</span>
      </div>

      <div
        className="mt-2.5 flex gap-1"
        role="img"
        aria-label={`${scale.label}: ${word.toLowerCase()}, ${value} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={`h-[3px] flex-1 ${step <= value ? "bg-ink" : "bg-rule"}`}
          />
        ))}
      </div>

      {showHint && (
        <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-muted">{scale.hint}</p>
      )}
    </div>
  );
}
