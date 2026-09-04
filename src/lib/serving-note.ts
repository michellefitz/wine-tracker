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
  /** Which SERVING_VERSION wrote it. See below. */
  version: number;
};

/**
 * Bump this when the prompt above changes, and every note in the log rewrites
 * itself the next time you open the bottle.
 *
 * The lookup has had this since it shipped — FACTS_VERSION — and the note
 * needed it for exactly the reason that showed up the first time the prompt
 * was improved: a bottle with a note never asked for another one, so the
 * better prompt reached new bottles only and every wine already in the log
 * kept the old wording for good. The alternative on offer was a command-line
 * script, which is not a thing to need when the app lives on a phone.
 *
 * 1 — the first notes, which came out clipped: "Pour and go."
 * 2 — the same again with room for the reason, which is the half you remember.
 */
export const SERVING_VERSION = 2;

const MODEL = process.env.ANTHROPIC_SERVING_MODEL ?? "claude-sonnet-5";
const TIMEOUT_MS = 20_000;

/*
 * Four short lines come to about a hundred and twenty tokens, so this is far
 * more than the job needs — deliberately. A response cut off at the ceiling is
 * unparseable JSON, which lands in the same catch as a network failure and
 * comes back as "no note", and a silent null that means "truncated" is the
 * hardest kind of nothing to explain.
 */
const MAX_TOKENS = 1000;

/*
 * A guard against a runaway, not an editor. The prompt asks for fifteen to
 * twenty-five words, which is about a hundred and fifty characters; this sits
 * above that so the only thing it ever cuts is something that went badly
 * wrong. A line trimmed mid-word reads worse than a long one.
 */
const LINE_MAX = 220;

const SYSTEM = `You write the serving note for one bottle of wine in someone's private wine log.

Four short lines, read on a phone by someone holding the bottle:

- temperature: the range in Celsius and nothing else, as "16-18 C" style with an en dash and a
  space before the degree sign: "16–18 °C". One number is fine for a wine that wants one.
- chill: how to get there with a fridge and a clock. Nobody owns a wine thermometer.
- glass: what to pour it into, and why, where the why changes what you'd reach for.
- air: what to actually do, how long for, and what it does to the wine.

Write about THIS wine. The grape, the place, the vintage and the style are what make a serving
note worth reading — "Nebbiolo tastes like all tannin when it's cold" earns its line; "red wines
are served at room temperature" does not. Where nothing about this bottle changes the usual
advice for its style, give the usual advice plainly rather than padding it out.

Short, but not clipped. One sentence, or two short ones — around fifteen to twenty-five words for
chill, glass and air. The instruction and the reason for it: "Half an hour in the fridge. Gamay
goes flat and jammy warm, and crunchy when it's cold." A bare order with the reason cut off is
the one thing worse than going on too long, because the reason is what you actually remember.

"air" in particular is never just "pour it". Say what to do — swirl it, leave it open, decant it —
and roughly how long, even when the answer is that it wants none: "Nothing to do. Drink it the day
you open it." An empty-sounding line there reads as though you ran out of things to say.

Never:
- open two lines the same way, or use a phrase you would use for every wine of this colour
- write "this wine", "this one", "this bottle"
- hedge: no "consider", "you might want to", "generally speaking", "it is recommended"
- explain what a decanter is, or assume one. A jug is a decanter. So is a second glass.
- describe how the wine tastes for its own sake. What warmth or air does to it is the point;
  a tasting note is written elsewhere on the page.

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
 * Why there's no note, when there's no note.
 *
 * The first version of this returned a bare null and logged the reason to the
 * server, which is fine right up until someone asks why the serving section
 * never changes — and then the only honest answer is "look in the platform
 * logs". A reason costs nothing to carry and can be put on the screen.
 */
export type ServingNoteResult =
  | { note: ServingNote }
  | { note: null; reason: string };

/**
 * Writes the note. Never throws: the caller has a working answer already —
 * the rules in serving.ts — and this is the better one when it arrives.
 */
export async function servingNoteFor(
  client: Anthropic,
  bottle: string,
): Promise<ServingNoteResult> {
  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        // Four lines about a wine anyone in the trade could write from memory.
        thinking: { type: "disabled" },
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: `Bottle as it was logged:\n${bottle}` }],
      },
      { timeout: TIMEOUT_MS, maxRetries: 0 },
    );

    if (response.stop_reason === "refusal") {
      return { note: null, reason: "The model declined to write one for this bottle." };
    }
    if (response.stop_reason === "max_tokens") {
      return { note: null, reason: "The note ran past its length limit and came back unfinished." };
    }

    const block = response.content.find((item) => item.type === "text");
    if (!block || block.type !== "text") {
      return { note: null, reason: "Nothing came back." };
    }

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(block.text) as Record<string, unknown>;
    } catch {
      console.error("serving-note: unreadable JSON:", block.text.slice(0, 200));
      return { note: null, reason: "What came back wasn't a readable note." };
    }

    const temperature = line(raw.temperature, 40);
    const chill = line(raw.chill, LINE_MAX);
    const glass = line(raw.glass, LINE_MAX);
    const air = line(raw.air, LINE_MAX);

    // All four or none. Half a note next to three lines of rule-written advice
    // would read as two different people writing about the same bottle.
    if (!temperature || !chill || !glass || !air) {
      return { note: null, reason: "The note came back with lines missing." };
    }
    return { note: { temperature, chill, glass, air, version: SERVING_VERSION } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("serving-note: could not write one:", detail);
    return { note: null, reason: `The API said: ${detail.slice(0, 200)}` };
  }
}

/** The stored shape, checked on the way out of the database. */
export function asServingNote(value: unknown): ServingNote | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const temperature = line(raw.temperature, 40);
  const chill = line(raw.chill, LINE_MAX);
  const glass = line(raw.glass, LINE_MAX);
  const air = line(raw.air, LINE_MAX);
  if (!temperature || !chill || !glass || !air) return null;
  // Notes written before there was a version are version 1 by definition.
  const version = typeof raw.version === "number" ? raw.version : 1;
  return { temperature, chill, glass, air, version };
}

/** Whether this one was written by a prompt we've since improved on. */
export function noteIsStale(note: ServingNote | null): boolean {
  return !note || note.version < SERVING_VERSION;
}
