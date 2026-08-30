/**
 * The two waits worth drawing for.
 *
 * Both of these take real seconds — a label going off to be read, a bottle
 * being searched for on the web — and a bar of grey rectangles says nothing
 * about either. A line drawing does: the glass fills while the search runs,
 * the label gets scanned while the label is being read. Same hairline weight
 * as the rules and chips elsewhere, so they belong to the same page.
 *
 * All the motion lives in globals.css so it can be turned off in one place
 * for anyone who's asked their phone to stop animating things.
 */

/** One wave period is 32 units wide, so scrolling by 32 loops seamlessly. */
const WAVE = `M-64 10 ${"c4 -2.4 12 -2.4 16 0 s12 2.4 16 0 ".repeat(6)}L128 48 L-64 48 Z`;

/*
 * The caption is a sentence, so it's set as one.
 *
 * It used to be letterspaced caps, which is the app's wayfinding voice — the
 * label on a region of the page. "Reading the label…" isn't a label on
 * anything; it's the drawing telling you what it's doing, and shouting it made
 * a wait feel like an announcement.
 */
function Frame({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <div className="flex flex-col items-center py-2" role="status" aria-live="polite">
      {children}
      <p className="mt-3 text-[0.875rem] text-muted">{caption}</p>
    </div>
  );
}

/** Shared line weight — the same hairline as a rule, not a heavier "icon" stroke. */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * A glass filling, for the seconds a bottle is being looked up.
 *
 * The liquid is a wave that travels sideways under a clip of the bowl, so the
 * surface keeps moving even at the top of the pour and the loop never snaps.
 */
export function PouringGlass({ caption }: { caption: string }) {
  return (
    <Frame caption={caption}>
      <svg
        viewBox="0 0 56 72"
        className="h-[4.75rem] w-[3.75rem] text-ink-soft"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="loader-bowl">
            <path d="M14 8 C14 27 20 40 28 40 C36 40 42 27 42 8 Z" />
          </clipPath>
        </defs>

        {/* The pour, landing just as the surface comes up to meet it. */}
        <path
          className="loader-drop"
          d="M28 6 c1.7 2.4 2.7 3.9 2.7 5.1 a2.7 2.7 0 0 1 -5.4 0 c0 -1.2 1 -2.7 2.7 -5.1 Z"
          fill="var(--color-wine)"
          opacity="0.55"
        />

        <g clipPath="url(#loader-bowl)">
          <g className="loader-fill">
            <g className="loader-wave">
              <path d={WAVE} fill="var(--color-wine)" opacity="0.45" />
            </g>
          </g>
        </g>

        <path {...stroke} d="M14 8 H42" />
        <path {...stroke} d="M14 8 C14 27 20 40 28 40 C36 40 42 27 42 8" />
        <path {...stroke} d="M28 40 V61" />
        <path {...stroke} d="M17 62.5 Q28 66 39 62.5" />
      </svg>
    </Frame>
  );
}

/** The three lines of "writing" on the label, read one after another. */
const LABEL_LINES = [
  { y: 43, x2: 34 },
  { y: 47.5, x2: 32.5 },
  { y: 52, x2: 30 },
];

/**
 * A label being read, for the wait after the shutter.
 *
 * The sweep crosses the label and the writing appears behind it — which is
 * what's actually happening on the other end of the request.
 */
export function ReadingLabel({ caption }: { caption: string }) {
  return (
    <Frame caption={caption}>
      <svg
        viewBox="0 0 56 72"
        className="h-[4.75rem] w-[3.75rem] text-ink-soft"
        aria-hidden="true"
      >
        <path
          {...stroke}
          d="M23 5 h10 v14 c0 4 6 6 6 13 v29 a3 3 0 0 1 -3 3 h-16 a3 3 0 0 1 -3 -3 v-29 c0 -7 6 -9 6 -13 z"
        />
        <path {...stroke} d="M23 11 H33" />
        <rect {...stroke} x="19" y="38" width="18" height="17" rx="1" />

        {LABEL_LINES.map((line, index) => (
          <path
            key={line.y}
            {...stroke}
            className="loader-read"
            style={{ animationDelay: `${index * 0.18}s` }}
            d={`M22 ${line.y} H${line.x2}`}
          />
        ))}

        <path
          {...stroke}
          className="loader-scan"
          stroke="var(--color-wine)"
          d="M19 38 H37"
        />
      </svg>
    </Frame>
  );
}
