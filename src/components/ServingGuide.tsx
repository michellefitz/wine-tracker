import StyleMark from "@/components/StyleMark";
import type { GrapeStyle } from "@/lib/grapes";
import type { Serving } from "@/lib/serving";

/** Same hairline weight as the loaders and the rules — one drawing hand. */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * A thermometer, a glass and a breath of air.
 *
 * Line drawings rather than emoji or a symbol font: the app already draws in
 * this hand — the loaders, the grape, the map pin — and three little pictures
 * down the left of the rows is what turns a table into something you can find
 * your way around without reading the labels.
 */
function Icon({ of }: { of: "temperature" | "glass" | "air" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-muted"
    >
      {of === "temperature" && (
        <>
          <path {...stroke} d="M12 4.5a2 2 0 0 1 2 2v7.1a3.6 3.6 0 1 1 -4 0V6.5a2 2 0 0 1 2 -2z" />
          <path {...stroke} d="M12 9.5v5.4" />
        </>
      )}
      {of === "glass" && (
        <>
          <path {...stroke} d="M8 4h8c0 6.5-2 9-4 9s-4-2.5-4-9z" />
          <path {...stroke} d="M12 13v6" />
          <path {...stroke} d="M9 19.5h6" />
        </>
      )}
      {of === "air" && (
        <>
          <path {...stroke} d="M3 9h9.5a2.5 2.5 0 1 0 -2.5 -2.5" />
          <path {...stroke} d="M3 13h13a2.5 2.5 0 1 1 -2.5 2.5" />
          <path {...stroke} d="M3 17h6" />
        </>
      )}
    </svg>
  );
}

/**
 * How to serve this one, in the order you'd need it.
 *
 * Temperature first, because it's the decision you have to make before you
 * open anything and the one most often got wrong. Then the glass, then whether
 * to give it air — by which point the bottle is open and you have time to read.
 *
 * Three rows and no rules between them. A line under every row made three
 * short paragraphs look like a spreadsheet; the icons separate them now, and
 * the single rule underneath closes the section rather than dividing its
 * insides.
 */
export default function ServingGuide({
  serving,
  mark = null,
  variant = "panel",
}: {
  serving: Serving;
  mark?: GrapeStyle | null;
  variant?: "panel" | "section";
}) {
  const rows = [
    { of: "temperature" as const, term: "Temperature", value: serving.temperature, note: serving.chill },
    { of: "glass" as const, term: "Glass", value: serving.glass },
    { of: "air" as const, term: "Air", value: serving.air },
  ];

  return (
    <section className={variant === "section" ? "mt-10" : "mx-auto mt-10 max-w-md"}>
      <div className="mb-4 flex items-baseline gap-2.5 border-b border-rule pb-2">
        {mark && <StyleMark style={mark} />}
        <h2 className="essay text-[1.375rem] leading-none text-ink">Serving</h2>
        <span className="text-[0.9375rem] text-muted">{serving.style}</span>
      </div>

      <dl className="space-y-4">
        {rows.map((row) => (
          <div key={row.term} className="flex gap-3">
            <Icon of={row.of} />
            <div className="min-w-0">
              <dt className="eyebrow">{row.term}</dt>
              <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink">{row.value}</dd>
              {/* Same size and face as the line above it: this was set smaller
                  and lighter to mark it a footnote, and just read as a second,
                  harder-to-read font on the one row you most want to read. */}
              {row.note && (
                <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink">{row.note}</dd>
              )}
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
