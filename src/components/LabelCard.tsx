import type { Wine } from "@/lib/types";

/**
 * A typeset label built from the text we read off the bottle — not a picture.
 *
 * Nothing here is invented: every line is a field the label reader lifted from
 * your photo, so it can be wrong only in the way the photo was wrong. Because
 * it renders as text rather than an image, it stays sharp at any size and costs
 * nothing to store.
 */

/** One accent per wine type; everything else is derived from it. */
const ACCENT: Record<string, string> = {
  Red: "#7a1b32",
  White: "#94802f",
  Rosé: "#bf6a78",
  Sparkling: "#a8873f",
  Orange: "#a85f2c",
  Dessert: "#8a5c26",
  Fortified: "#5c3324",
};

const DEFAULT_ACCENT = "#736c63";

export default function LabelCard({ wine }: { wine: Wine }) {
  const accent = (wine.wine_type && ACCENT[wine.wine_type]) || DEFAULT_ACCENT;
  const footer = [wine.region ?? wine.country, wine.grapes[0]].filter(Boolean).join(" · ");

  return (
    <div
      className="flex h-full w-full items-center justify-center p-3"
      style={{ backgroundColor: `color-mix(in oklab, ${accent} 4%, var(--color-paper))` }}
    >
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-2
          border px-3 py-5 text-center"
        style={{ borderColor: `color-mix(in oklab, ${accent} 22%, transparent)` }}
      >
        {wine.producer && (
          <p
            className="line-clamp-2 text-[0.5625rem] font-medium uppercase tracking-[0.16em]"
            style={{ color: `color-mix(in oklab, ${accent} 75%, var(--color-ink))` }}
          >
            {wine.producer}
          </p>
        )}

        <p className="serif-display line-clamp-3 text-[1.0625rem] leading-[1.15] text-ink">
          {wine.name}
        </p>

        {wine.vintage && (
          <p className="serif-text text-[0.9375rem] leading-none" style={{ color: accent }}>
            {wine.vintage}
          </p>
        )}

        {footer && (
          <>
            <span
              className="block h-px w-6"
              style={{ backgroundColor: `color-mix(in oklab, ${accent} 40%, transparent)` }}
            />
            <p className="line-clamp-2 text-[0.5rem] uppercase tracking-[0.14em] text-muted">
              {footer}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
