import Anthropic, { APIError } from "@anthropic-ai/sdk";
import type { GrapeProfile } from "@/lib/types";

/**
 * Asks Claude to write the reference entry for one grape variety.
 *
 * This is the only place the app generates prose rather than reading it off a
 * label, so the prompt works hard at two things: staying inside what's actually
 * settled about a variety, and saying it the way a person in a shop would.
 *
 * Bump PROFILE_VERSION to have every cached profile rewritten on next view.
 */
export const PROFILE_VERSION = 1;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

const SYSTEM_PROMPT = `You write short reference entries about wine grape varieties for someone
who is just starting to pay attention to what they drink. They keep a log of bottles they've had
and want to understand why they liked one and not another.

Write like a good shop assistant, not a wine critic. Plain words, no scores, no vintage talk, no
"notes of graphite". If a comparison helps ("closer to a cup of tea than a cup of coffee"), use it.

The four scales describe the variety as it is typically made and sold — a supermarket bottle, not
a collector's example. Use the whole 1-5 range: if everything comes out a 3 the scales teach
nothing. Rate them:
- acidity: 1 flat and soft, 5 mouth-watering and sharp.
- body: 1 watery-light, 5 thick and mouth-filling.
- tannin: the drying grip from skins. Use null for white and rosé grapes, which have effectively
  none. 1 barely there, 5 firmly drying.
- sweetness: 1 bone dry, 5 dessert-sweet. Most dry table wine is 1 or 2. Only go higher when the
  grape is genuinely usually made sweet.

Where a grape is made in two distinct styles (oaked and unoaked, dry and sweet), rate the more
common one and say so in the summary — the scales cannot show two answers.

"facts" is the part someone repeats to a friend: where the grape came from, how it got its name,
why it took over a region, what it used to be called. One to three of them, one sentence each,
and only things that are well established. Nothing you are unsure about, no invented statistics.

"similar" lists grapes that would please someone who liked this one, by name only.

If the input isn't a grape variety at all — a blend name, a region, a brand, a typo you can't
resolve — set is_grape to false, leave the rest empty, and say why in "note". If it is a variety
under a local synonym (Shiraz, Pinot Grigio), set is_grape true and use the name the person is
most likely to see on a bottle in an Irish or British supermarket.`;

const SCHEMA = {
  type: "object",
  properties: {
    is_grape: { type: "boolean" },
    name: { anyOf: [{ type: "string" }, { type: "null" }] },
    also_known_as: { type: "array", items: { type: "string" } },
    colour: { anyOf: [{ type: "string", enum: ["red", "white", "other"] }, { type: "null" }] },
    summary: { anyOf: [{ type: "string" }, { type: "null" }] },
    acidity: { anyOf: [{ type: "integer" }, { type: "null" }] },
    body: { anyOf: [{ type: "integer" }, { type: "null" }] },
    tannin: { anyOf: [{ type: "integer" }, { type: "null" }] },
    sweetness: { anyOf: [{ type: "integer" }, { type: "null" }] },
    flavours: { type: "array", items: { type: "string" } },
    regions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          country: { anyOf: [{ type: "string" }, { type: "null" }] },
          note: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["name", "country", "note"],
        additionalProperties: false,
      },
    },
    pairings: { type: "array", items: { type: "string" } },
    similar: { type: "array", items: { type: "string" } },
    facts: { type: "array", items: { type: "string" } },
    note: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: [
    "is_grape",
    "name",
    "also_known_as",
    "colour",
    "summary",
    "acidity",
    "body",
    "tannin",
    "sweetness",
    "flavours",
    "regions",
    "pairings",
    "similar",
    "facts",
    "note",
  ],
  additionalProperties: false,
} as const;

const USER_PROMPT = `Write the entry for this grape, as it would be written for someone holding a
supermarket bottle of it: two or three sentences of summary, the four scales, what it tastes like,
where it comes from, what to eat with it, and what else to try.

Grape: `;

type RawProfile = Omit<GrapeProfile, "slug" | "name"> & {
  is_grape: boolean;
  name: string | null;
  summary: string | null;
  note: string | null;
};

export type Generated =
  | { status: "ok"; profile: Omit<GrapeProfile, "slug"> }
  | { status: "unknown"; note: string | null }
  | { status: "unavailable"; message: string };

/**
 * The scales, defended in code rather than in the schema — structured output
 * won't accept a numeric range on an integer. Out-of-range values are pulled
 * back rather than discarded: a 6 means "as high as it goes", not "unknown".
 */
function clampScale(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(5, Math.max(1, Math.round(number)));
}

function strings(value: unknown, max: number, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, max))
    .filter(Boolean)
    .slice(0, limit);
}

/**
 * What actually went wrong, short enough to put on the page.
 *
 * This app has one user behind a passcode, and the alternative is reading
 * Vercel logs on a phone in a shop. A refused key, an exhausted balance and a
 * function that ran out of time are three different problems that otherwise
 * look identical from the sofa.
 */
function apiDetail(error: unknown): string {
  if (error instanceof APIError) {
    return `${error.status ? `${error.status} ` : ""}${error.message}`.slice(0, 200);
  }
  return (error instanceof Error ? error.message : String(error)).slice(0, 200);
}

/** Generates one profile. Never throws — a failure is a status, not an exception. */
export async function generateGrapeProfile(name: string): Promise<Generated> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      status: "unavailable",
      message: "ANTHROPIC_API_KEY isn't set, so grape notes can't be written.",
    };
  }

  const client = new Anthropic();

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [{ role: "user", content: `${USER_PROMPT}${name}` }],
    });
  } catch (error) {
    const detail = apiDetail(error);
    console.error("grape-profile: Anthropic call failed:", detail);
    return {
      status: "unavailable",
      message: `Couldn't write the notes for this grape. The API said: ${detail}`,
    };
  }

  if (response.stop_reason === "refusal") {
    return { status: "unavailable", message: "Couldn't look that grape up just now — try again in a minute." };
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { status: "unavailable", message: "Got an empty entry back — try again in a minute." };
  }

  let raw: RawProfile;
  try {
    raw = JSON.parse(textBlock.text) as RawProfile;
  } catch {
    console.error("grape-profile: response was not valid JSON:", textBlock.text.slice(0, 200));
    return { status: "unavailable", message: "Got an unreadable entry back — try again in a minute." };
  }

  const canonical = typeof raw.name === "string" ? raw.name.trim().slice(0, 80) : "";
  const summary = typeof raw.summary === "string" ? raw.summary.trim().slice(0, 1200) : "";

  if (!raw.is_grape || !canonical || !summary) {
    const note = typeof raw.note === "string" ? raw.note.trim().slice(0, 300) : null;
    return { status: "unknown", note: note || null };
  }

  const regions = Array.isArray(raw.regions)
    ? raw.regions
        .filter((region): region is NonNullable<typeof region> => Boolean(region?.name))
        .map((region) => ({
          name: String(region.name).trim().slice(0, 80),
          country: region.country ? String(region.country).trim().slice(0, 60) : null,
          note: region.note ? String(region.note).trim().slice(0, 240) : null,
        }))
        .slice(0, 4)
    : [];

  return {
    status: "ok",
    profile: {
      name: canonical,
      also_known_as: strings(raw.also_known_as, 60, 6),
      colour: raw.colour === "red" || raw.colour === "white" || raw.colour === "other"
        ? raw.colour
        : null,
      summary,
      acidity: clampScale(raw.acidity),
      body: clampScale(raw.body),
      tannin: clampScale(raw.tannin),
      sweetness: clampScale(raw.sweetness),
      flavours: strings(raw.flavours, 40, 8),
      regions,
      pairings: strings(raw.pairings, 60, 6),
      similar: strings(raw.similar, 60, 5),
      facts: strings(raw.facts, 400, 3),
    },
  };
}
