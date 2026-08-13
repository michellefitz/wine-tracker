import ScoreBar from "@/components/ScoreBar";
import { paragraphs } from "@/lib/prose";
import { searchFor, siteName, sourceFor } from "@/lib/sources";
import type { StoredFacts } from "@/lib/wine-facts";
import { awardGlyph, foodGlyph } from "@/lib/wine-colours";

/** Prose in readable paragraphs, made here rather than hoped for. */
function Paragraphs({ text, className }: { text: string; className: string }) {
  const parts = paragraphs(text);

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
      <h3 className="eyebrow mb-2">{title}</h3>
      {children}
    </section>
  );
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
  query = "",
  warning = null,
}: {
  facts: StoredFacts;
  /** The bottle as you logged it, for searching a reviewer's own site. */
  query?: string;
  warning?: string | null;
}) {
  const empty =
    !facts.found && !facts.summary && facts.ratings.length === 0 && facts.awards.length === 0;

  return (
    <div className="rise-in">
      {empty ? (
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          {facts.note ??
            "Nothing turned up for this one. Supermarket own-label bottles usually have no coverage anywhere — it says nothing about the wine."}
        </p>
      ) : (
        <div className="space-y-5">
          {/*
            What it tastes like goes first, and takes the lead type with it.
            It's two lines where the summary is six, and it's the sentence you
            actually want when you're standing in front of the bottle — the
            history of the estate can wait until after it.
          */}
          {facts.style && (
            <Block title="In the glass">
              <div className="space-y-2">
                <Paragraphs
                  text={facts.style}
                  className="essay text-[1.0625rem] leading-[1.55] text-ink"
                />
              </div>
            </Block>
          )}

          {facts.summary && (
            <div className="space-y-3">
              <Paragraphs
                text={facts.summary}
                className="text-[0.9375rem] leading-relaxed text-ink-soft"
              />
            </div>
          )}

          {facts.ratings.length > 0 && (
            <Block title="Reviews">
              <ul className="divide-y divide-rule">
                {facts.ratings.map((rating) => {
                  // The page it was read from when the search returned it; the
                  // site's own search for this bottle when it didn't. Vivino is
                  // the reason for the second one — it blocks crawlers, so its
                  // scores get quoted far more often than its pages come back.
                  const page = sourceFor(rating.source, facts.sources);
                  const href = page ?? searchFor(rating.source, query);

                  const body = (
                    <>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="flex items-baseline gap-1.5 text-[0.9375rem] text-ink-soft">
                          <span
                            className={
                              href ? "underline decoration-rule underline-offset-4" : undefined
                            }
                          >
                            {rating.source}
                          </span>
                          {href && (
                            <span
                              aria-hidden="true"
                              className="text-[0.875rem] leading-none text-wine"
                            >
                              ↗
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="text-[1.0625rem] tabular-nums text-ink">
                            {rating.score}
                          </span>
                          {rating.scale && (
                            <span className="text-[0.8125rem] text-muted"> {rating.scale}</span>
                          )}
                        </span>
                      </div>
                      <ScoreBar rating={rating} />
                      {rating.count && (
                        <span className="mt-1.5 block text-[0.75rem] text-muted">
                          {rating.count}
                        </span>
                      )}
                    </>
                  );

                  return (
                    <li key={`${rating.source}-${rating.score}`}>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer noopener"
                          title={page ? "Open this review" : "Search this site for the bottle"}
                          className="block py-2.5 transition-opacity active:opacity-60"
                        >
                          {body}
                        </a>
                      ) : (
                        <div className="py-2.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Block>
          )}

          {facts.awards.length > 0 && (
            <Block title="Awards">
              <ul className="space-y-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                {facts.awards.map((award) => (
                  <li key={award} className="flex gap-2.5">
                    <span aria-hidden="true" className="shrink-0 leading-[1.4]">
                      {awardGlyph(award)}
                    </span>
                    <span>{award}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {facts.food.length > 0 && (
            <Block title="Goes with">
              <ul className="flex flex-wrap gap-1.5">
                {facts.food.map((food) => {
                  const glyph = foodGlyph(food);
                  return (
                    <li
                      key={food}
                      className="flex items-center gap-1.5 rounded-full border border-rule
                        bg-card px-3.5 py-1.5 text-[0.8125rem] text-ink-soft"
                    >
                      {glyph && <span aria-hidden="true">{glyph}</span>}
                      {food}
                    </li>
                  );
                })}
              </ul>
            </Block>
          )}

          {facts.sources.length > 0 && (
            <Block title="Reference links">
              <ul className="space-y-1">
                {facts.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="line-clamp-1 text-[0.8125rem] transition-colors hover:text-ink"
                    >
                      <span className="text-ink-soft underline decoration-rule underline-offset-4">
                        {siteName(source.url)}
                      </span>
                      <span className="text-muted"> · {source.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      )}

      {warning && <p className="mt-6 text-[0.75rem] leading-relaxed text-wine">{warning}</p>}
    </div>
  );
}
