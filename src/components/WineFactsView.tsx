import type { StoredFacts } from "@/lib/wine-facts";

/**
 * Model prose arrives with its paragraph breaks intact; one wall of text is
 * unreadable on a phone, so they're honoured rather than collapsed.
 */
function Paragraphs({ text, className }: { text: string; className: string }) {
  const parts = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <>
      {parts.map((part) => (
        <p key={part.slice(0, 40)} className={className}>
          {part}
        </p>
      ))}
    </>
  );
}

/**
 * Every block below the summary is a heading and its content — nothing appears
 * unlabelled, and nothing carries its own top or bottom rule. Two stacked lists
 * that each drew their own border met as a double hairline, which read as a
 * seam between two tables nobody had named.
 */
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="eyebrow mb-2.5">{title}</h3>
      {children}
    </section>
  );
}

function looked(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  const days = Math.floor((Date.now() - when.getTime()) / 86_400_000);
  if (days <= 0) return "Looked up today";
  if (days === 1) return "Looked up yesterday";
  if (days < 30) return `Looked up ${days} days ago`;
  return `Looked up ${when.toLocaleDateString("en-IE", { month: "long", year: "numeric" })}`;
}

/**
 * What the world says about this bottle.
 *
 * It sits below your own note and rating on purpose. This app exists because a
 * consensus score clusters every wine between three and four stars; someone
 * else's 3.9 is context for your verdict, not a correction of it.
 */
export default function WineFactsView({
  facts,
  warning = null,
}: {
  facts: StoredFacts;
  warning?: string | null;
}) {
  const empty =
    !facts.found && !facts.summary && facts.ratings.length === 0 && facts.awards.length === 0;

  return (
    <div>
      {empty ? (
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          {facts.note ??
            "Nothing turned up for this one. Supermarket own-label bottles usually have no coverage anywhere — it says nothing about the wine."}
        </p>
      ) : (
        <div className="space-y-7">
          {facts.summary && (
            <div className="space-y-4">
              <Paragraphs
                text={facts.summary}
                className="essay text-[1.0625rem] leading-[1.55] text-ink"
              />
            </div>
          )}

          {facts.style && (
            <Block title="In the glass">
              <div className="space-y-2">
                <Paragraphs
                  text={facts.style}
                  className="text-[0.9375rem] leading-relaxed text-ink-soft"
                />
              </div>
            </Block>
          )}

          {facts.ratings.length > 0 && (
            <Block title="Reviews">
              <ul className="divide-y divide-rule">
                {facts.ratings.map((rating) => (
                  <li
                    key={`${rating.source}-${rating.score}`}
                    className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-[0.9375rem] text-ink-soft">{rating.source}</span>
                    <span className="shrink-0 text-right">
                      <span className="text-[0.9375rem] tabular-nums text-ink">
                        {rating.score}
                        {rating.scale && <span className="text-muted"> {rating.scale}</span>}
                      </span>
                      {rating.count && (
                        <span className="mt-0.5 block text-[0.75rem] text-muted">
                          {rating.count}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {facts.awards.length > 0 && (
            <Block title="Awards">
              <ul className="list-disc space-y-1.5 pl-4 text-[0.9375rem] leading-relaxed text-ink-soft marker:text-muted">
                {facts.awards.map((award) => (
                  <li key={award}>{award}</li>
                ))}
              </ul>
            </Block>
          )}

          {facts.food.length > 0 && (
            <Block title="Goes with">
              <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
                {facts.food.join(" · ")}
              </p>
            </Block>
          )}

          {facts.sources.length > 0 && (
            <Block title="Where this came from">
              <ul className="space-y-1.5">
                {facts.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="line-clamp-1 text-[0.8125rem] text-muted underline decoration-rule
                        underline-offset-4 transition-colors hover:text-ink"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      )}

      {warning && <p className="mt-6 text-[0.75rem] leading-relaxed text-wine">{warning}</p>}

      <p className="mt-7 text-[0.75rem] leading-relaxed text-muted">
        {looked(facts.looked_up_at)} by searching the web. Other people&apos;s scores are
        context for your own verdict, not a correction of it.
      </p>
    </div>
  );
}
