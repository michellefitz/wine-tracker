import Link from "next/link";
import ScaleMeter from "@/components/ScaleMeter";
import ServingGuide from "@/components/ServingGuide";
import WineCard from "@/components/WineCard";
import { grapeSlug } from "@/lib/grapes";
import { servingForGrape } from "@/lib/serving";
import { GRAPE_SCALES } from "@/lib/taxonomy";
import type { GrapeProfile, Wine } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-rule pt-7">
      <h2 className="eyebrow mb-4">{title}</h2>
      {children}
    </section>
  );
}

/** A red grape's scales run bordeaux, a white's run gold. */
function grapeAccent(colour: GrapeProfile["colour"]): string | undefined {
  if (colour === "red") return "var(--color-wine)";
  if (colour === "white") return "var(--color-gold)";
  return undefined;
}

const COLOUR_LABEL: Record<string, string> = {
  red: "Red grape",
  white: "White grape",
  other: "Grape variety",
};

/**
 * The reference entry for one grape.
 *
 * Ordered the way the question actually gets asked in a shop: what is it, what
 * will it feel like, what does it taste of, where's it from — and only then the
 * background reading. Your own bottles come last, because they're the reward
 * for scrolling, not the lesson.
 */
export default function GrapeProfileView({
  profile,
  yourWines,
  warning = null,
}: {
  profile: GrapeProfile;
  yourWines: Wine[];
  /** Set when the notes couldn't be cached — the page still reads fine without it. */
  warning?: string | null;
}) {
  const scales = GRAPE_SCALES.filter((scale) => profile[scale.id] !== null);
  const liked = yourWines.filter((wine) => wine.score > 0).length;

  // The same advice a bottle of it would give you, minus whatever the label
  // would have added — a grape page knows the name and the colour, which is
  // exactly what the serving rules read.
  const serving = servingForGrape(profile.name, profile.colour);

  return (
    <div>
      <header className="text-center">
        {profile.colour && <p className="eyebrow">{COLOUR_LABEL[profile.colour]}</p>}
        <h1 className="essay mt-2 text-[1.875rem] leading-[1.15] text-ink">
          {profile.name}
        </h1>
        {profile.also_known_as.length > 0 && (
          <p className="mt-3 text-[0.8125rem] text-muted">
            Also sold as {profile.also_known_as.join(", ")}
          </p>
        )}
      </header>

      <p className="mx-auto mt-7 max-w-md essay text-[1.1875rem] leading-[1.55] text-ink">
        {profile.summary}
      </p>

      <div className="mx-auto max-w-md">
        {scales.length > 0 && (
          <Section title="What it's like">
            {/*
              Divided from the inside, with no rule of its own. Every list on
              this page used to open with a rule right under its heading and
              close with one right above the next heading — so each heading sat
              in a box, and every section boundary was two hairlines and a gap.
              The section's own rule is enough.
            */}
            <div className="divide-y divide-rule">
              {scales.map((scale) => (
                <ScaleMeter
                  key={scale.id}
                  scale={scale}
                  value={profile[scale.id]}
                  accent={grapeAccent(profile.colour)}
                />
              ))}
            </div>
          </Section>
        )}

        {profile.flavours.length > 0 && (
          <Section title="Tastes of">
            <ul className="flex flex-wrap gap-1.5">
              {profile.flavours.map((flavour) => (
                <li
                  key={flavour}
                  className="rounded-full border border-rule bg-card px-3.5 py-1.5
                    text-[0.8125rem] text-ink-soft"
                >
                  {flavour}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.regions.length > 0 && (
          <Section title="Where it comes from">
            <ul className="divide-y divide-rule">
              {profile.regions.map((region) => (
                <li key={`${region.name}-${region.country}`} className="py-3.5">
                  <p className="text-[0.9375rem] text-ink">
                    {region.name}
                    {region.country && <span className="text-muted"> · {region.country}</span>}
                  </p>
                  {region.note && (
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">
                      {region.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {serving && <ServingGuide serving={serving} variant="section" />}

        {profile.pairings.length > 0 && (
          <Section title="Goes with">
            <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
              {profile.pairings.join(" · ")}
            </p>
          </Section>
        )}

        {profile.facts.length > 0 && (
          <Section title="Worth knowing">
            <ul className="space-y-4">
              {profile.facts.map((fact) => (
                <li key={fact} className="essay text-[1.0625rem] leading-[1.55] text-ink">
                  {fact}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {profile.similar.length > 0 && (
          <Section title="If you like this, try">
            <ul className="flex flex-wrap gap-1.5">
              {profile.similar.map((grape) => (
                <li key={grape}>
                  <Link href={`/grape/${grapeSlug(grape)}`} className="chip inline-block">
                    {grape}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {yourWines.length > 0 && (
        <Section title={`Your bottles · ${yourWines.length}`}>
          <p className="mb-5 text-[0.9375rem] leading-relaxed text-ink-soft">
            {liked === yourWines.length
              ? yourWines.length === 1
                ? "You've had one, and you liked it."
                : `You've had ${yourWines.length} and liked every one.`
              : liked === 0
                ? `You've had ${yourWines.length === 1 ? "one" : yourWines.length} and haven't taken to ${yourWines.length === 1 ? "it" : "them"} yet.`
                : `You liked ${liked} of the ${yourWines.length} you've had.`}
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 sm:gap-x-5">
            {yourWines.map((wine) => (
              <li key={wine.id}>
                <WineCard wine={wine} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-12 border-t border-rule pt-6">
        {warning && (
          <p className="mb-3 text-[0.75rem] leading-relaxed text-wine">{warning}</p>
        )}
        <p className="text-[0.75rem] leading-relaxed text-muted">
          Written by Claude rather than copied from a reference book, so take it as
          a starting point for your own palate — not the last word.
        </p>
      </div>
    </div>
  );
}
