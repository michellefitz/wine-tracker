import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { WINE_TYPES } from "@/lib/taxonomy";
import type { LabelReading } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BASE64_LENGTH = 2_000_000;

const SYSTEM_PROMPT = `You read wine bottle labels from photographs and return what is printed on them.

Report only what you can actually see. If the producer, vintage, or region is not
legible in the photo, return null for it rather than guessing from the style of the
bottle. Do not infer a vintage from a lot number or a barcode.

Wine names on labels are often split across lines and mixed with the producer name.
Put the estate or brand in "producer" and the specific cuvée or range in "name". When
a label carries only one name, use it as "name" and leave "producer" null.

Grapes: list them only if the label states them, or if the appellation strictly implies
them (Chablis is Chardonnay, Rioja is predominantly Tempranillo). Supermarket own-label
bottles usually state the grape on the front.

Set is_wine_label to false if the photo is not a wine bottle or the label is unreadable,
and put a short explanation in "note".`;

const SCHEMA = {
  type: "object",
  properties: {
    is_wine_label: { type: "boolean" },
    producer: { anyOf: [{ type: "string" }, { type: "null" }] },
    name: { anyOf: [{ type: "string" }, { type: "null" }] },
    vintage: { anyOf: [{ type: "integer" }, { type: "null" }] },
    region: { anyOf: [{ type: "string" }, { type: "null" }] },
    country: { anyOf: [{ type: "string" }, { type: "null" }] },
    grapes: { type: "array", items: { type: "string" } },
    wine_type: { anyOf: [{ type: "string", enum: [...WINE_TYPES] }, { type: "null" }] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    note: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: [
    "is_wine_label",
    "producer",
    "name",
    "vintage",
    "region",
    "country",
    "grapes",
    "wine_type",
    "confidence",
    "note",
  ],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set — you can still add the wine by hand." },
      { status: 500 },
    );
  }

  let dataUrl = "";
  try {
    const body = (await request.json()) as { dataUrl?: unknown };
    dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Expected a base64 data URL" }, { status: 400 });
  }

  const [, mime, base64] = match;
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: `Unsupported image type: ${mime}` }, { status: 415 });
  }
  if (base64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "That image is too large" }, { status: 413 });
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
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mime as "image/jpeg", data: base64 },
            },
            { type: "text", text: "What wine is this? Read the label." },
          ],
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("identify: Anthropic call failed:", message);
    return NextResponse.json(
      { error: "Couldn't read the label just now. Add the details by hand and carry on." },
      { status: 502 },
    );
  }

  if (response.stop_reason === "refusal") {
    return NextResponse.json(
      { error: "Couldn't process that photo. Try another, or add the details by hand." },
      { status: 422 },
    );
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json(
      { error: "Got an empty reading back. Add the details by hand." },
      { status: 502 },
    );
  }

  let reading: LabelReading;
  try {
    reading = JSON.parse(textBlock.text) as LabelReading;
  } catch {
    console.error("identify: response was not valid JSON:", textBlock.text.slice(0, 200));
    return NextResponse.json(
      { error: "Got an unreadable reading back. Add the details by hand." },
      { status: 502 },
    );
  }

  return NextResponse.json(reading);
}
