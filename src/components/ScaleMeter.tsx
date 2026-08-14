import { type GrapeScale, scaleEnds, scaleLevelWord } from "@/lib/taxonomy";

/**
 * One axis of a grape, as a five-step meter.
 *
 * The point of a fixed scale is comparison: Sauvignon Blanc's acidity only
 * means something next to Chardonnay's, and that only works if every grape is
 * drawn the same way. So the geometry never varies with the value — five
 * segments, always, filled from the left.
 *
 * The fill takes the grape's own colour — bordeaux for a red, gold for a white
 * — which is decoration, not meaning: the number is the number either way.
 */
export default function ScaleMeter({
  scale,
  value,
  showHint = true,
  accent,
}: {
  scale: GrapeScale;
  value: number | null;
  showHint?: boolean;
  /** Colour for the filled steps; ink when the grape's colour isn't known. */
  accent?: string;
}) {
  const word = scaleLevelWord(scale, value);
  if (!word || value === null) return null;

  const [low, high] = scaleEnds(scale);

  return (
    <div className="py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="eyebrow">{scale.label}</span>
        <span className="text-[0.9375rem] text-ink">{word}</span>
      </div>

      {/*
        The ends sit either side of the bar rather than under it: "Fresh" is
        only a fact about a wine once you can see it fell between Low and High.
        Inline keeps that within the row's existing height.
      */}
      <div
        className="mt-2.5 flex items-center gap-2"
        role="img"
        aria-label={`${scale.label}: ${word.toLowerCase()}, ${value} out of 5, on a scale from ${low.toLowerCase()} to ${high.toLowerCase()}`}
      >
        <span aria-hidden="true" className="shrink-0 text-[0.6875rem] leading-none text-muted">
          {low}
        </span>

        <span className="flex flex-1 gap-1">
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              className={`h-1 flex-1 rounded-full ${
                step <= value ? (accent ? "" : "bg-ink") : "bg-rule"
              }`}
              style={step <= value && accent ? { backgroundColor: accent } : undefined}
            />
          ))}
        </span>

        <span aria-hidden="true" className="shrink-0 text-[0.6875rem] leading-none text-muted">
          {high}
        </span>
      </div>

      {showHint && (
        <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-muted">{scale.hint}</p>
      )}
    </div>
  );
}
