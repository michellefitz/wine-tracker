import StyleMark from "@/components/StyleMark";
import type { GrapeStyle } from "@/lib/grapes";
import type { Serving } from "@/lib/serving";

/**
 * How to serve this one, in the order you'd need it.
 *
 * Temperature first, because it's the decision you have to make before you
 * open anything and the one most often got wrong. Then the glass, then whether
 * to give it air — by which point the bottle is open and you have time to read.
 *
 * This is known rather than looked up, so it renders instantly and appears on
 * every bottle, including the ones nothing on the web has written about.
 *
 * Two frames. On a wine page it's a panel with its own rules top and bottom,
 * sitting between the details table and the write-up. On a grape page it's one
 * more section in a stack of them, so it borrows their heading and their single
 * top rule — two rules where the others have one is exactly the sort of seam
 * that makes a page look assembled rather than designed.
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
  const rows: { term: string; value: string; note?: string }[] = [
    { term: "Temperature", value: serving.temperature, note: serving.chill },
    { term: "Glass", value: serving.glass },
    { term: "Air", value: serving.air },
  ];

  const body = (
    <dl className={`divide-y divide-rule ${variant === "panel" ? "border-y border-rule" : ""}`}>
      {rows.map((row) => (
        <div key={row.term} className="py-3">
          <dt className="eyebrow">{row.term}</dt>
          <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">{row.value}</dd>
          {/*
            Same size and face as the lines below it. This was set smaller and
            lighter to mark it as a footnote, and it just read as a second,
            harder-to-read font on the one row you most want to read.
          */}
          {row.note && (
            <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">{row.note}</dd>
          )}
        </div>
      ))}
    </dl>
  );

  if (variant === "section") {
    return (
      <section className="mt-10 border-t border-rule pt-7">
        <h2 className="eyebrow mb-2">Serving · {serving.style}</h2>
        {body}
      </section>
    );
  }

  return (
    <section className="mx-auto mt-9 max-w-md">
      <div className="mb-3 flex items-center gap-2">
        {mark && <StyleMark style={mark} />}
        <h2 className="eyebrow">Serving · {serving.style}</h2>
      </div>
      {body}
    </section>
  );
}
