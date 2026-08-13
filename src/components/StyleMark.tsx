import { WINE_COLOURS } from "@/lib/wine-colours";
import type { GrapeStyle } from "@/lib/grapes";

/**
 * A glass per heading on the grape index, drawn in the same hairline as the
 * loaders — same stroke weight, same washed fill, same restraint.
 *
 * The silhouette does the work rather than the colour: a wide bowl, a narrow
 * tulip, a flute and a small dessert glass are told apart at sixteen pixels,
 * where two washes three degrees of hue apart are not. The colour is the one
 * already assigned to that wine type everywhere else in the app.
 */

type Mark = {
  /** The rim, drawn on its own so the bowl can stay an open curve. */
  rim: string;
  bowl: string;
  /**
   * Runs to where the foot's curve actually passes under it, not to where the
   * foot's endpoints sit — a couple of units short leaves the glass standing
   * on a gap.
   */
  stem: string;
  foot: string;
  /** Where the wine sits. Never at the rim — nobody pours to the top. */
  level: number;
  bubbles?: [number, number, number][];
};

const MARKS: Record<GrapeStyle, Mark> = {
  // A big round bowl: the one you swirl.
  Red: {
    rim: "M4.5 3 H19.5",
    bowl: "M4.5 3 C4.5 13 8 18.5 12 18.5 C16 18.5 19.5 13 19.5 3",
    stem: "M12 18.5 V29.4",
    foot: "M7 28.5 Q12 30.5 17 28.5",
    level: 9,
  },
  // Narrower, to keep it cold and hold the aromatics in.
  White: {
    rim: "M6.5 3 H17.5",
    bowl: "M6.5 3 C6.5 12 9 17.5 12 17.5 C15 17.5 17.5 12 17.5 3",
    stem: "M12 17.5 V29.4",
    foot: "M7 28.5 Q12 30.5 17 28.5",
    level: 10,
  },
  // A flute, with the bead rising up it.
  Sparkling: {
    rim: "M8.5 2 H15.5",
    bowl: "M8.5 2 L10.8 19 H13.2 L15.5 2",
    stem: "M12 19 V29.4",
    foot: "M7.5 28.5 Q12 30.5 16.5 28.5",
    level: 6,
    bubbles: [
      [11.3, 9, 0.7],
      [12.7, 12.4, 0.6],
      [11.6, 15.4, 0.5],
    ],
  },
  // Small, because a large glass of it would be a mistake.
  Dessert: {
    rim: "M7 6 H17",
    bowl: "M7 6 C7 12.5 9 17 12 17 C15 17 17 12.5 17 6",
    stem: "M12 17 V28.4",
    foot: "M7.5 27.5 Q12 29.5 16.5 27.5",
    level: 11,
  },
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export default function StyleMark({ style }: { style: GrapeStyle }) {
  const mark = MARKS[style];
  const colour = WINE_COLOURS[style] ?? "currentColor";

  // Each style appears once per page, so a name beats a generated id — it
  // survives a re-render and reads for itself in the inspector.
  const clip = `pour-${style.toLowerCase()}`;

  return (
    <svg
      viewBox="0 0 24 32"
      className="h-[1.3rem] w-auto shrink-0 text-muted"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clip}>
          <path d={`${mark.bowl} Z`} />
        </clipPath>
      </defs>

      <rect
        x="0"
        y={mark.level}
        width="24"
        height="32"
        fill={colour}
        opacity="0.45"
        clipPath={`url(#${clip})`}
      />

      {mark.bubbles?.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={colour} opacity="0.55" />
      ))}

      <path {...stroke} d={mark.rim} />
      <path {...stroke} d={mark.bowl} />
      <path {...stroke} d={mark.stem} />
      <path {...stroke} d={mark.foot} />
    </svg>
  );
}
