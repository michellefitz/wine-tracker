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
        <div className="space-y-6">
          {facts.summary && (
            <div className="space-y-4">
              <Paragraphs text={facts.summary} className="essay text-[1.0625rem] leading-[1.55] text-ink" />
            </div>
          )}

          {facts.style && (
            <div className="space-y-3">
              <Paragraphs text={facts.style} className="text-[0.9375rem] leading-relaxed text-ink-soft" />
            </div>
          )}

          {facts.ratings.length > 0 && (
            <ul className="border-t border-rule">
              {facts.ratings.map((rating) => (
                <li
                  key={`${rating.source}-${rating.score}`}
                  className="flex items-baseline justify-between gap-4 border-b border-rule py-3"
                >
                  <span className="text-[0.9375rem] text-ink-soft">{rating.source}</span>
                  <span className="shrink-0 text-right">
                    <span className="text-[0.9375rem] tabular-nums text-ink">
                      {rating.score}
                      {rating.scale && <span className="text-muted"> {rating.scale}</span>}
                    </span>
                    {rating.count && (
                      <span className="mt-0.5 block text-[0.75rem] text-muted">{rating.count}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {facts.awards.length > 0 && (
            <div>
              <h3 className="eyebrow mb-2">Awards</h3>
              <ul className="space-y-1 text-[0.9375rem] leading-relaxed text-ink-soft">
                {facts.awards.map((award) => (
                  <li key={award}>{award}</li>
                ))}
              </ul>
            </div>
          )}

          {facts.food.length > 0 && (
            <div>
              <h3 className="eyebrow mb-2">Goes with</h3>
              <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
                {facts.food.join(" · ")}
              </p>
            </div>
          )}

          {facts.sources.length > 0 && (
            <div>
              <h3 className="eyebrow mb-2">Where this came from</h3>
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
            </div>
          )}
        </div>
      )}

      {warning && <p className="mt-5 text-[0.75rem] leading-relaxed text-wine">{warning}</p>}

      <p className="mt-5 text-[0.75rem] leading-relaxed text-muted">
        {looked(facts.looked_up_at)} by searching the web. Other people&apos;s scores are
        context for your own verdict, not a correction of it.
      </p>
    </div>
  );
}
