import { GoogleGenAI } from "@google/genai";

/**
 * Re-photographing a bottle you already photographed.
 *
 * This is the only kind of image generation in here, and the distinction
 * matters more than it might look. It takes the picture you took and asks for
 * the same bottle under studio lighting — it does not draw a bottle from a
 * name. Asked for "a wine bottle whose label reads Quinta da Raza", an image
 * model will happily produce a beautiful bottle wearing a label that has never
 * existed: invented typography, invented crest, text that dissolves into
 * plausible gibberish at the second line. In a log whose whole purpose is a
 * record of what you actually drank, that is a forgery of your own memory.
 * Starting from your photograph keeps the thing on the label the thing that
 * was on the label.
 *
 * Even so, this is a generated picture and it is offered as one. Diffusion
 * editing rewrites small text — a back-label paragraph will not survive, and
 * fine print on the front may not either — so it sits next to your real photo
 * as a choice, never replacing it, and never running unless you ask.
 *
 * Google stamps every generated image with a SynthID watermark, which is
 * exactly right for this: the picture stays identifiable as generated even
 * after it leaves the app.
 */

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";

/**
 * The cream the app is painted in, named to the model so bottles land on the
 * page rather than on a rectangle of their own.
 *
 * A diffusion model will not hit a hex exactly, and it doesn't have to: the
 * cards fade their edges into the page, so the last thing anyone sees is the
 * page's own colour and a few points of drift disappears under it. Naming the
 * value still narrows the spread a lot — left to itself the model wandered
 * between #ede7db and #f5f3f0 across four bottles.
 *
 * If --color-paper in globals.css changes, change this with it.
 */
const STUDIO_GROUND = "#EDE6DA";
const TIMEOUT_MS = 60_000;

/**
 * Written as a re-lighting job rather than a creative brief. Every clause
 * either pins something down or forbids an invention; there is nothing here
 * asking the model to be imaginative, because everything it imagines on a wine
 * label is wrong.
 */
const INSTRUCTION = `Re-photograph this exact wine bottle as a studio product shot.

Keep the bottle itself completely unchanged: the same label, the same wording, the same
typography, the same artwork, colours, crest and vintage, the same capsule colour, the same glass
colour and the same bottle shape. Do not redesign, redraw, translate, correct, tidy or re-set any
text on the label. Do not invent a producer, a vintage, a region or an award. If part of the label
is blurred, creased or cut off in the photograph, leave it as it is rather than filling it in.

Change only the photography around it. Stand the bottle upright and square to the camera, centred,
whole, with the base a little above the bottom edge. Put it on a plain seamless background that is a
very light, pale, cool cream — close to off-white with only the faintest warm tint. The exact hex is
${STUDIO_GROUND}. The background must be uniform and flat, filling the frame edge to edge with no
horizon line, no vignette, no gradient, no shadow on the background, and no darkening or warming
towards the corners or edges. Do not make the background orange, tan, beige or noticeably warm. No
props, no glasses, no hands, no table, no text and no reflections of a room. Light it with a soft
box from the front left so there is a gentle highlight down the glass and a soft shadow directly
beneath the bottle only. Nothing else in the frame.`;

export type StudioShot = { base64: string; mime: string };

/**
 * The bottle, restaged. Null when the model declined, timed out, or came back
 * with no picture — the caller keeps whatever it already had.
 */
export async function studioShot(
  photo: { base64: string; mime: string },
  { signal }: { signal?: AbortSignal } = {},
): Promise<StudioShot | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const abort = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const interaction = await ai.interactions.create(
    {
      model: MODEL,
      // Text first, then the image — the order the documented editing example
      // uses. Probably immaterial, but it is one less thing to be wrong about.
      input: [
        { type: "text", text: INSTRUCTION },
        { type: "image", mime_type: photo.mime, data: photo.base64 },
      ],
      // 4:5 is the card, so the frame comes back already the right shape.
      response_format: { type: "image", aspect_ratio: "4:5", image_size: "1K" },
    },
    { signal: abort },
  );

  const image = interaction.output_image;
  if (!image?.data) return null;

  return { base64: image.data, mime: image.mime_type ?? "image/png" };
}
