"use client";

import { useMemo, useState } from "react";
import { LABEL_GROUPS, matchTerms, termsInGroup } from "@/lib/label-terms";

/**
 * The glossary, searchable.
 *
 * Search matters more than browsing here: the moment you need this page is the
 * one where you're holding a bottle with a word on it you don't know, so typing
 * that word should be the fastest route. The groups are for the other mood —
 * reading it on the sofa to find out what you've been missing.
 */
export default function LabelDecoder() {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => matchTerms(query), [query]);

  return (
    <div>
      <input
        type="search"
        className="field text-[0.9375rem]"
        placeholder="Look up a word on the label…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {matches.length === 0 ? (
        <p className="border-t border-rule py-16 text-center text-[0.9375rem] text-muted">
          Nothing matches that. It may just be the producer&apos;s own invention — plenty
          of what&apos;s printed on a label means nothing at all.
        </p>
      ) : (
        LABEL_GROUPS.map((group) => {
          const entries = termsInGroup(matches, group);
          if (entries.length === 0) return null;

          return (
            <section key={group} className="mt-10 border-t border-rule pt-7">
              <h2 className="eyebrow mb-5">{group}</h2>
              <dl>
                {entries.map((entry) => (
                  <div key={entry.term} className="border-b border-rule pb-5 last:border-b-0 [&:not(:first-child)]:pt-5">
                    <dt className="flex flex-wrap items-baseline gap-x-2.5">
                      <span className="serif-text text-[1.0625rem] leading-snug text-ink">
                        {entry.term}
                      </span>
                      {entry.say && (
                        <span className="text-[0.8125rem] text-muted">{entry.say}</span>
                      )}
                    </dt>
                    <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {entry.meaning}
                      {entry.tell && (
                        <span className="mt-2 block text-[0.875rem] leading-relaxed text-muted">
                          {entry.tell}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })
      )}
    </div>
  );
}
