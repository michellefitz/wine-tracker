import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { tidyBottle, type Box } from "@/lib/bottle-image";
import { readPhoto } from "@/lib/photo-input";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
/**
 * Two questions, and the second one is the interesting one.
 *
 * Where the bottle is, is easy and always useful — it's what makes every card
 * in the log the same shot at the same size instead of whatever you happened
 * to frame. Whether the background can be removed is a judgement about the
 * photo, and the honest answer is usually no: a bottle on a restaurant table
 * is surrounded by glasses, hands and candlelight, and any attempt to cut it
 * out will take a bite out of the bottle. Saying so is a good outcome. The
 * crop alone is already worth having.
 */
const SYSTEM_PROMPT = `You are looking at a photograph of a wine bottle, to help crop it.

Return where the bottle is, as fractions of the image's width and height, with x and y at its
top-left corner. Include the whole bottle from the very top of the capsule to the base, and its
full width at the widest point. If several bottles are visible, describe the one most clearly
the subject of the photo — largest, most centred, most in focus.

Then judge the background, meaning everything that is not the bottle.

Say "plain" only when the bottle sits against a single continuous surface — a wall, a worktop,
a tablecloth, a plain backdrop — that is close to one colour, or shades smoothly from one to
another, and holds no other objects overlapping or touching the bottle. A soft shadow on that
surface is still plain.

Say "busy" for everything else, and everything you are unsure about: other bottles, glasses,
plates, hands, foliage, a patterned cloth, a bookshelf, a strong pattern or texture, a scene
behind the bottle rather than a surface. Busy is the ordinary answer and costs the user nothing
— their photo is simply cropped instead. A bottle with a piece missing is much worse.`;

const SCHEMA = {
  type: "object",
  properties: {
    is_bottle: { type: "boolean" },
    box: {
      type: "object",
      properties: {
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
      },
      required: ["x", "y", "width", "height"],
      additionalProperties: false,
    },
    background: { type: "string", enum: ["plain", "busy"] },
  },
  required: ["is_bottle", "box", "background"],
  additionalProperties: false,
} as const;

type Reading = { is_bottle: boolean; box: Box; background: "plain" | "busy" };

function sane(box: Box): boolean {
  return (
    [box.x, box.y, box.width, box.height].every((n) => typeof n === "number" && Number.isFinite(n)) &&
    box.width > 0.02 &&
    box.height > 0.02 &&
    box.x < 1 &&
    box.y < 1
  );
}

export async function POST(request: Request) {
  let body: { dataUrl?: unknown; photoId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const input = await readPhoto(body);
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: input.status });
  }
  const { mime, base64 } = input.photo;

  const original = Buffer.from(base64, "base64");

  /*
   * Without a key there's no bounding box, but there's still a picture worth
   * squaring up: a centred 4:5 crop is what the card was going to show anyway.
   */
  let reading: Reading | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await new Anthropic().messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        thinking: { type: "adaptive" },
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mime as "image/jpeg", data: base64 },
              },
              { type: "text", text: "Where is the bottle, and is the background plain?" },
            ],
          },
        ],
      });

      if (response.stop_reason !== "refusal") {
        const text = response.content.find((block) => block.type === "text");
        if (text?.type === "text") reading = JSON.parse(text.text) as Reading;
      }
    } catch (error) {
      // A tidy-up that can't reach the model is a plain crop, not a failure.
      console.error("tidy: could not read the photo:", error instanceof Error ? error.message : error);
    }
  }

  const box = reading?.is_bottle && sane(reading.box) ? reading.box : null;

  try {
    const tidied = await tidyBottle(original, box, {
      cutOut: box !== null && reading?.background === "plain",
    });
    return NextResponse.json({
      dataUrl: `data:image/jpeg;base64,${tidied.jpeg.toString("base64")}`,
      cutOut: tidied.cutOut,
      note:
        tidied.note ??
        (box === null ? "The bottle couldn't be found, so the photo was only squared up." : null),
    });
  } catch (error) {
    console.error("tidy: could not process:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "That photo couldn't be tidied up." }, { status: 500 });
  }
}
