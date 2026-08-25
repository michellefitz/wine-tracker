import StyleMark from "@/components/StyleMark";
import { styleOf } from "@/lib/grapes";
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
 */
export default function ServingGuide({
  serving,
  wineType,
}: {
  serving: Serving;
  wineType: string | null;
}) {
  const mark = wineType ? styleOf(wineType) : null;

  const rows: { term: string; value: string; note?: string }[] = [
    { term: "Temperature", value: serving.temperature, note: serving.chill },
    { term: "Glass", value: serving.glass },
    { term: "Air", value: serving.air },
  ];

  return (
    <section className="mx-auto mt-9 max-w-md">
      <div className="mb-3 flex items-center gap-2">
        {mark && <StyleMark style={mark} />}
        <h2 className="eyebrow">Serving · {serving.style}</h2>
      </div>

      <dl className="divide-y divide-rule border-y border-rule">
        {rows.map((row) => (
          <div key={row.term} className="py-3">
            <dt className="eyebrow">{row.term}</dt>
            <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">
              {row.value}
            </dd>
            {row.note && (
              <dd className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
                {row.note}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
