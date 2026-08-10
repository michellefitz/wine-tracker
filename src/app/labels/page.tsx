import type { Metadata } from "next";
import Link from "next/link";
import LabelDecoder from "@/components/LabelDecoder";

export const metadata: Metadata = {
  title: "Reading a label · Cellar Notes",
};

/**
 * Static on purpose. None of this changes, none of it needs your log, and the
 * moment you want it — in a shop, or at a table, on one bar of signal — is the
 * worst possible moment to be waiting on a database.
 */
export default function LabelsPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-20 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <nav className="mb-9 flex items-center justify-between">
        <Link href="/" className="link-quiet">
          ← All wines
        </Link>
        <Link href="/grapes" className="link-quiet">
          Grapes
        </Link>
      </nav>

      <header className="mb-9">
        <h1 className="display text-[1.75rem] leading-[1.1] text-ink">
          Reading a label
        </h1>

        <div className="essay mt-3 max-w-md space-y-4 text-[1.0625rem] leading-relaxed text-ink-soft">
          <p>
            Start with the one rule that unlocks most of a wine list:{" "}
            <strong className="font-medium text-ink">
              European labels name the place, everywhere else names the grape.
            </strong>
          </p>
          <p>
            So a French bottle says Chablis and expects you to know that&apos;s Chardonnay.
            Sancerre is Sauvignon Blanc. Rioja is mostly Tempranillo, Barolo is Nebbiolo,
            Chianti is mostly Sangiovese. An Australian bottle just says Shiraz on the front.
          </p>
          <p className="text-[0.9375rem] text-muted">
            Nothing below is a judgement of quality. It&apos;s what the words are
            allowed to mean — and, often, that they&apos;re allowed to mean nothing.
          </p>
        </div>
      </header>

      <LabelDecoder />
    </main>
  );
}
