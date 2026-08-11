import type { WineRating } from "@/lib/types";

/**
 * A review score as a bar as well as a number.
 *
 * Scores arrive as text on purpose — "3.9", "91", "Silver" — because that's how
 * they're written and rounding someone else's number is a small lie. So the bar
 * is derived here and simply doesn't appear when the score isn't a number: a
 * medal has no percentage, and inventing one would be worse than a plain word.
 */

/** Where this score sits between nothing and full marks, or null if it can't be known. */
export function scoreFraction(rating: WineRating): number | null {
  const value = Number.parseFloat(rating.score.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value)) return null;

  const said = `${rating.scale ?? ""} ${rating.score}`.toLowerCase();
  const outOf = said.match(/(?:out of|\/)\s*(\d+)/);

  let top: number;
  if (outOf) top = Number(outOf[1]);
  else if (/point/.test(said)) top = 100;
  // No scale given: read it from the number's own size, the way a person would.
  else if (value <= 5) top = 5;
  else if (value <= 20) top = 20;
  else top = 100;

  if (!Number.isFinite(top) || top <= 0) return null;
  return Math.max(0, Math.min(1, value / top));
}

/**
 * Critic scores start at "drinkable", not at zero — a 100-point wine score
 * effectively runs from 80. Stretching that range is what makes the bars
 * readable next to each other instead of all sitting near full.
 */
function drawn(fraction: number, top100: boolean): number {
  if (!top100) return fraction;
  return Math.max(0, Math.min(1, (fraction - 0.75) / 0.25));
}

export default function ScoreBar({ rating }: { rating: WineRating }) {
  const fraction = scoreFraction(rating);
  if (fraction === null) return null;

  const top100 = /point/i.test(`${rating.scale ?? ""}`) || fraction > 0.9;
  const width = `${Math.round(drawn(fraction, top100) * 100)}%`;

  return (
    <span
      className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-rule"
      role="img"
      aria-label={`${rating.score}${rating.scale ? ` ${rating.scale}` : ""} from ${rating.source}`}
    >
      <span className="block h-full rounded-full bg-gold" style={{ width }} />
    </span>
  );
}
