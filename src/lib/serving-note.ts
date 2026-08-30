import Anthropic from "@anthropic-ai/sdk";

/**
 * How to serve this bottle, written for this bottle.
 *
 * serving.ts answers the same question from rules, and it will keep doing so —
 * it's instant, it's offline, and it's right. What it can't be is *different*.
 * Three firm reds in a row got the same sentence about a full bowl and the
 * empty space above the wine, word for word, and the third time you read it
 * you stop reading the section. Advice you skip is advice that isn't there.
 *
 * So: one short generation per bottle, cached with the rest of its facts and
 * written from the grape, the region and the vintage rather than from a bucket.
 * It runs alongside the web search rather than after it, because none of this
 * needs the web — a Barolo's temperature is not a thing to look up — so it
 * costs the lookup no wall-clock time at all.
 *
 * When it fails, or before a bottle has ever been looked up, the rules answer.
 * Nothing here is load-bearing.
 */

export type ServingNote = {
  /** The range, as a range: "16–18 °C". */
  temperature: string;
  /** How to get there with a fridge and a clock. */
  chill: string;
  glass: string;
  air: string;
};

const MODEL = process.env.ANTHROPIC_SERVING_MODEL ?? "claude-sonnet-5";
const TIMEOUT_MS = 20_000;

const SYSTEM = `You write the serving note for one bottle of wine in someone's private wine log.

Four short lines, read on a phone by someone holding the bottle:

- temperature: the range in Celsius and nothing else, as "16-18 C" style with an en dash and a
  space before the degree sign: "16–18 °C". One number is fine for a wine that wants one.
- chill: how to get there with a fridge and a clock. Nobody owns a wine thermometer.
- glass: what to pour it into, and the reason only if the reason changes what you'd do.
- air: whether it wants air, and what to actually do about it.

Write about THIS wine. The grape, the place, the vintage and the style are what make a serving
note worth reading — "Nebbiolo tastes like all tannin when it's cold" earns its line; "red wines
are served at room temperature" does not. Where nothing about this bottle changes the usual
advice for its style, give the usual advice briefly rather than padding it out.

Length is the whole point. Twelve words is the ceiling for chill, glass and air, and most good
answers are shorter. Sentence fragments are better than full sentences: "Straight from the
fridge." "Twenty minutes out, no longer."

Never:
- open two lines the same way, or use a phrase you would use for every wine of this colour
- write "this wine", "this one", "this bottle"
- hedge: no "consider", "you might want to", "generally speaking", "it is recommended"
- explain what a decanter is, or assume one. A jug is a decanter. So is a second glass.
- describe how the wine tastes. That is written elsewhere on the page.

If the bottle is only identifiable to a colour — a supermarket own-label red, no grape, no
region — then say the plain thing plainly and briefly. A short honest answer is not a failure.`;

const SCHEMA = {
  type: "object",
  properties: {
    temperature: { type: "string" },
    chill: { type: "string" },
    glass: { type: "string" },
    air: { type: "string" },
  },
  required: ["temperature", "chill", "glass", "air"],
  additionalProperties: false,
} as const;

/** Trims to a sane length and refuses the empty string. */
function line(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ").slice(0, max);
  return text || null;
}

/**
 * Writes the note. Never throws and never reports a failure upwards: the
 * caller has a working answer already and this is the better one when it
 * arrives.
 */
export async function servingNoteFor(
  client: Anthropic,
  bottle: string,
): Promise<ServingNote | null> {
  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM,
        // Four lines about a wine anyone in the trade could write from memory.
        thinking: { type: "disabled" },
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: `Bottle as it was logged:\n${bottle}` }],
      },
      { timeout: TIMEOUT_MS, maxRetries: 0 },
    );

    if (response.stop_reason === "refusal") return null;

    const block = response.content.find((item) => item.type === "text");
    if (!block || block.type !== "text") return null;

    const raw = JSON.parse(block.text) as Record<string, unknown>;
    const temperature = line(raw.temperature, 40);
    const chill = line(raw.chill, 140);
    const glass = line(raw.glass, 140);
    const air = line(raw.air, 140);

    // All four or none. Half a note next to three lines of rule-written advice
    // would read as two different people writing about the same bottle.
    if (!temperature || !chill || !glass || !air) return null;
    return { temperature, chill, glass, air };
  } catch (error) {
    console.error(
      "serving-note: could not write one:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/** The stored shape, checked on the way out of the database. */
export function asServingNote(value: unknown): ServingNote | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const temperature = line(raw.temperature, 40);
  const chill = line(raw.chill, 140);
  const glass = line(raw.glass, 140);
  const air = line(raw.air, 140);
  if (!temperature || !chill || !glass || !air) return null;
  return { temperature, chill, glass, air };
}
