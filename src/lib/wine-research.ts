import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { clip } from "@/lib/prose";
import { flatten } from "@/lib/text";
import type { Wine, WineFacts } from "@/lib/types";

/**
 * Looks one specific bottle up on the web and turns what it finds into a record.
 *
 * Two calls, deliberately. The first searches and writes prose with citations;
 * the second reads that prose and fills in a schema. Doing both at once would
 * mean asking for cited output and constrained output from the same request,
 * and the honest reason to split them is smaller than that: the extraction step
 * can be told, in isolation, that it may only use what the research actually
 * says. A rating this app shows must have been read somewhere, not recalled.
 *
 * Bump FACTS_VERSION to have every stored record rewritten on next view.
 */
export const FACTS_VERSION = 2;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

/**
 * Filing what the research found is a transcription job, not a research job:
 * everything it may use is in the text in front of it. A quicker model does it
 * just as well and hands the seconds back to the searching.
 */
const FILING_MODEL = process.env.ANTHROPIC_FILING_MODEL ?? "claude-sonnet-5";

/** Cap the searching — but not at three, which wasn't enough to be wrong twice. */
const MAX_SEARCHES = 5;

/**
 * Budgets, sized so the pair finishes inside a 60s function budget with room
 * left to return a message. A lookup that overruns has to fail *visibly* —
 * being killed mid-flight is the one outcome with nothing to show.
 *
 * RESEARCH_BUDGET_MS is wall clock across the whole search phase, resumes
 * included. It used to be a per-call timeout, which meant a paused turn could
 * quietly spend it twice and blow the function budget on its own.
 */
const RESEARCH_BUDGET_MS = 38_000;
const RESEARCH_MIN_MS = 8_000;
const EXTRACT_TIMEOUT_MS = 13_000;

const RESEARCH_SYSTEM = `You research one specific bottle of wine on the web for someone who
keeps a log of what they've drunk. They already know whether they liked it; what they want is
what the wider world knows about this exact bottle.

Search the way a person does. Your first search must be the short query given to you, exactly as
written and nothing else: no vintage, no region, no country, no "Sparkling", no quotation marks.
That query is the shortest phrase that names the wine, and short is what search engines are good
at. Piling the label into one query is how a well-covered wine comes back with nothing.

Only after that first search has told you what the wine is should you narrow — add the vintage to
find that year's page, or the producer's name to separate two wines that share a word. If a
search comes back thin, change tack rather than lengthening the query: try the producer's own
site, an importer, a retailer, or the wine name with the word "review". Repeating a long query
with one more word on the end never helps.

Report only what you actually found in the search results, and say where each thing came from.
The right answer is often "almost nothing": supermarket own-label bottles frequently have no
coverage at all, and saying so plainly is more useful than padding. Never supply a rating, score,
award or tasting note from memory — if it isn't in the results you read, it doesn't exist for
this purpose.

Write the summary as two or three short paragraphs with a blank line between them, not one
block: what the wine is, then what it tastes like, then anything notable about where it comes
from. Short paragraphs are the point — this is read on a phone.

Cover, where the results support it:
- What this wine is and what it tastes like, in plain words.
- The grape or grapes it's made from, if the results state them.
- Hard label facts, each as its own item: producer, alcohol, serving temperature, ageing,
  closure. Skip bottle size, vegan/vegetarian suitability and allergen statements — they say
  nothing about the wine.
- Any ratings or scores, with the source, the scale, and how many people rated it.
- Any awards or medals, with the year.
- Concrete facts from the producer or retailer: alcohol, ageing, closure, whether it's organic.
- What to eat with it.

If the results are clearly about a different wine — same producer, different bottling, or a
different vintage you cannot confirm — say so rather than passing it off as this one.`;

const EXTRACT_SYSTEM = `You turn a research write-up about one bottle of wine into a structured
record. You have no knowledge of your own here: every field must come from the write-up in front
of you. If the write-up doesn't establish something, leave it out. Never invent a rating, a score,
a medal or a number, and never round or "correct" one.

Scores stay exactly as written, as text: "3.9", "91", "Silver". The scale is the rest of the
phrase: "out of 5", "points". Ratings only count when the write-up names where they came from.

"details" is for hard facts a label or producer would state, as short label/value pairs like
{"label": "Alcohol", "value": "13.5%"}. Use these labels exactly when you have them: "Producer",
"Alcohol", "Serving temperature", "Ageing", "Closure". Put the grapes in "grapes" instead, never
in details. Leave out bottle size, vegan or vegetarian suitability, and allergen statements.

"summary" keeps the paragraph breaks from the write-up — copy them through as blank lines.

"style" is one short line on how it tastes — body, sweetness, acidity, the dominant flavours —
not a second paragraph of prose. It appears on the page under its own heading, so it should read
as a description on its own: "Full-bodied and dry, with dark fruit, warm spice and vanilla."

If the write-up says little or nothing was found, set found to false and use "note" to say what
was searched for and why it came up short. That's a normal outcome, not a failure.`;

const SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    summary: { anyOf: [{ type: "string" }, { type: "null" }] },
    style: { anyOf: [{ type: "string" }, { type: "null" }] },
    grapes: { type: "array", items: { type: "string" } },
    ratings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { type: "string" },
          score: { type: "string" },
          scale: { anyOf: [{ type: "string" }, { type: "null" }] },
          count: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["source", "score", "scale", "count"],
        additionalProperties: false,
      },
    },
    details: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
        required: ["label", "value"],
        additionalProperties: false,
      },
    },
    awards: { type: "array", items: { type: "string" } },
    food: { type: "array", items: { type: "string" } },
    note: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: ["found", "summary", "style", "grapes", "ratings", "details", "awards", "food", "note"],
  additionalProperties: false,
} as const;

export type Researched =
  | { status: "ok"; facts: Omit<WineFacts, "wine_id"> }
  | { status: "unavailable"; message: string };

/**
 * The whole label, as context for telling one bottle from another.
 *
 * This is what the wine *is* — not what to type into a search box. Handing all
 * of it to a search engine is what produced "no results" for a wine that
 * answers on the first page of Google.
 */
export function describeBottle(wine: Wine): string {
  return [
    wine.producer ? `Producer: ${wine.producer}` : null,
    `Wine: ${wine.name}`,
    wine.vintage ? `Vintage: ${wine.vintage}` : null,
    wine.region || wine.country
      ? `From: ${[wine.region, wine.country].filter(Boolean).join(", ")}`
      : null,
    wine.grapes.length > 0 ? `Grapes: ${wine.grapes.join(", ")}` : null,
    wine.wine_type ? `Type: ${wine.wine_type}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * The first thing to type into a search box: the shortest phrase that names
 * this wine and nothing more.
 *
 * Producers repeat themselves — Quinta da Raza makes Raza Pet-Nat — and a
 * query carrying the same word twice is a query a person would never type.
 * So any word already in the wine's name is dropped from the producer.
 */
export function searchQuery(wine: Wine): string {
  const inName = new Set(flatten(wine.name).split(" ").filter(Boolean));

  const producer = (wine.producer ?? "")
    .split(/\s+/)
    .filter((word) => word && !inName.has(flatten(word)))
    .join(" ")
    .trim();

  return [producer, wine.name.trim()].filter(Boolean).join(" ");
}

function apiDetail(error: unknown): string {
  if (error instanceof APIError) {
    return `${error.status ? `${error.status} ` : ""}${error.message}`.slice(0, 200);
  }
  return (error instanceof Error ? error.message : String(error)).slice(0, 200);
}

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * The pages the search actually returned, straight from the tool result.
 *
 * Never from the model's own text: a URL it typed out could be plausible and
 * wrong, and a link that 404s is worse than no link.
 */
function sourcesOf(content: Anthropic.ContentBlock[]): { title: string; url: string }[] {
  const seen = new Map<string, string>();

  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    const results = block.content;
    if (!Array.isArray(results)) continue; // an error object rather than results

    for (const result of results) {
      if (result.type !== "web_search_result" || !result.url) continue;
      if (!seen.has(result.url)) seen.set(result.url, result.title || result.url);
    }
  }

  return Array.from(seen.entries())
    .slice(0, 12)
    .map(([url, title]) => ({ title: title.slice(0, 160), url }));
}

/**
 * Details worth a row on the page. Bottle size and dietary-suitability lines are
 * on nearly every label and tell you nothing about how the wine tastes.
 */
const NOT_WORTH_A_ROW = /^(bottle\s*size|size|volume|vegan|vegetarian|allergens?|contains|sulphites?|sulfites?)\b/i;

export function worthShowing(detail: { label: string }): boolean {
  return !NOT_WORTH_A_ROW.test(detail.label.trim());
}

function strings(value: unknown, max: number, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, max))
    .filter(Boolean)
    .slice(0, limit);
}

function trimmed(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, max);
  return text || null;
}

/** Prose fields, cut to length on a sentence or word rather than mid-syllable. */
function clipped(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = clip(value, max);
  return text || null;
}

type Research = { text: string; sources: { title: string; url: string }[] };

/**
 * Runs the search. Server-side tools pause when their own loop hits its limit,
 * so the turn is resumed rather than treated as finished — a paused turn looks
 * like a complete one apart from the stop reason.
 *
 * Everything the model produces is kept, turn by turn. Reading only the last
 * response is how a lookup that searched four sites came back citing none of
 * them: the pages were in the paused turn, and the paused turn was thrown away.
 *
 * Takes its client rather than making one, so the pause-and-resume path can be
 * driven with a stub — it's the branch that broke, and the branch that never
 * runs on an ordinary lookup.
 */
export async function research(
  client: Anthropic,
  bottle: string,
  query: string,
): Promise<Research | Researched> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        `Find out what's known about this exact bottle. If the results are thin, say so.\n\n` +
        `${bottle}\n\nStart with this search, exactly as written: ${query}`,
    },
  ];

  const seen: Anthropic.ContentBlock[] = [];
  const deadline = Date.now() + RESEARCH_BUDGET_MS;

  // One resume at most: each pause costs another turn of searching, and the
  // budget below is what stops two of them from outliving the function.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining < RESEARCH_MIN_MS) break;

    let response: Anthropic.Message;
    try {
      response = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 8192,
          system: RESEARCH_SYSTEM,
          thinking: { type: "adaptive" },
          output_config: { effort: "low" },
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }],
          messages,
        },
        { timeout: remaining, maxRetries: 0 },
      );
    } catch (error) {
      const detail = apiDetail(error);
      console.error("wine-research: search call failed:", detail);
      return { status: "unavailable", message: `Couldn't search for this wine. The API said: ${detail}` };
    }

    seen.push(...response.content);

    if (response.stop_reason === "refusal") {
      return { status: "unavailable", message: "The search was declined for this wine." };
    }

    if (response.stop_reason === "pause_turn") {
      // Resume where it left off; no extra user turn, the API picks it up.
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    break;
  }

  const text = textOf(seen);
  if (!text) {
    return {
      status: "unavailable",
      message: "The search ran long and was stopped. Try Refresh — it often lands second time.",
    };
  }

  return { text, sources: sourcesOf(seen) };
}

/** Looks one bottle up. Never throws — a failure comes back as a status. */
export async function researchWine(wine: Wine): Promise<Researched> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: "unavailable", message: "ANTHROPIC_API_KEY isn't set, so wines can't be looked up." };
  }

  const client = new Anthropic();
  const bottle = describeBottle(wine);

  const found = await research(client, bottle, searchQuery(wine));
  if ("status" in found) return found;
  const { text, sources } = found;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create(
      {
        model: FILING_MODEL,
        max_tokens: 4096,
        system: EXTRACT_SYSTEM,
        thinking: { type: "adaptive" },
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        messages: [
          {
            role: "user",
            content: `Bottle as it was logged:\n${bottle}\n\nResearch write-up:\n${text}`,
          },
        ],
      },
      { timeout: EXTRACT_TIMEOUT_MS, maxRetries: 0 },
    );
  } catch (error) {
    const detail = apiDetail(error);
    console.error("wine-research: extract call failed:", detail);
    return { status: "unavailable", message: `Couldn't file what was found. The API said: ${detail}` };
  }

  if (response.stop_reason === "refusal") {
    return { status: "unavailable", message: "Couldn't file what was found for this wine." };
  }

  const block = response.content.find((item) => item.type === "text");
  if (!block || block.type !== "text") {
    return { status: "unavailable", message: "Got an empty record back." };
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(block.text) as Record<string, unknown>;
  } catch {
    console.error("wine-research: response was not valid JSON:", block.text.slice(0, 200));
    return { status: "unavailable", message: "Got an unreadable record back." };
  }

  const ratings = Array.isArray(raw.ratings)
    ? raw.ratings
        .filter((rating): rating is Record<string, unknown> => Boolean(rating) && typeof rating === "object")
        .map((rating) => ({
          source: trimmed(rating.source, 60) ?? "",
          score: trimmed(rating.score, 24) ?? "",
          scale: trimmed(rating.scale, 24),
          count: trimmed(rating.count, 40),
        }))
        .filter((rating) => rating.source && rating.score)
        .slice(0, 4)
    : [];

  const details = Array.isArray(raw.details)
    ? raw.details
        .filter((detail): detail is Record<string, unknown> => Boolean(detail) && typeof detail === "object")
        .map((detail) => ({
          label: trimmed(detail.label, 40) ?? "",
          value: trimmed(detail.value, 120) ?? "",
        }))
        .filter((detail) => detail.label && detail.value)
        .filter(worthShowing)
        .slice(0, 8)
    : [];

  const summary = clipped(raw.summary, 1200);
  const anything = Boolean(summary) || ratings.length > 0 || details.length > 0;

  return {
    status: "ok",
    facts: {
      found: raw.found === true && anything,
      summary,
      style: clipped(raw.style, 600),
      grapes: strings(raw.grapes, 60, 6),
      ratings,
      details,
      awards: strings(raw.awards, 120, 5),
      food: strings(raw.food, 60, 6),
      sources,
      note: clipped(raw.note, 400),
    },
  };
}
