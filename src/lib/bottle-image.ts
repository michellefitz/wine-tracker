/**
 * Turning a photo of a bottle into something that looks like a product shot.
 *
 * Two steps, and the second one is optional on purpose.
 *
 * The crop is the part that always helps. A photo taken on a kitchen table is
 * a bottle plus a table, at whatever angle you were standing, filling whatever
 * fraction of the frame you happened to catch — and the log shows all of them
 * side by side, where the inconsistency is the thing you notice. Cropping to
 * the bottle makes every card the same shot at the same size.
 *
 * Cutting the background away is the part that can go wrong. There is no
 * matting model here: this is a flood fill from the edges of the frame, which
 * is excellent against a plain wall or a worktop and hopeless against a
 * restaurant table with three glasses and a candle on it. So it is attempted
 * only when the caller says the background is plain, and it checks its own
 * work afterwards — a fill that swallowed the bottle, or barely started, is
 * thrown away and the plain crop is used instead. A tidy crop is a good
 * outcome; a bottle with a bite taken out of it is not.
 */

/** A rectangle in the photo, as fractions of its width and height. */
export type Box = { x: number; y: number; width: number; height: number };

export type Tidied = {
  jpeg: Buffer;
  /** False when only the crop was applied — see the module note. */
  cutOut: boolean;
  /** Why the cutout was skipped or rejected, for the log and the client. */
  note: string | null;
};

/* The card is 4:5, so the output is too — no second crop at display time. */
const OUT_WIDTH = 960;
const OUT_HEIGHT = 1200;

/** --color-paper, in sRGB. Matches the page the bottle will sit on. */
const PAPER = { r: 245, g: 242, b: 241 };

/** Room around the bottle, as a fraction of its longest side. */
const PADDING = 0.08;

/**
 * How far a neighbouring pixel may drift and still count as more background.
 * Comparing against the neighbour rather than a single background colour is
 * what lets the fill follow a wall that shades off towards a corner.
 */
const STEP_TOLERANCE = 22;

/** And how far the whole run may drift from the colour it started at. */
const DRIFT_TOLERANCE = 68;

/**
 * What a bottle looks like once the fill has run, as a share of the frame and
 * of its height. Outside these, whatever was found isn't a bottle: too big and
 * the fill never got going and the "subject" is the room; too short and it's a
 * smear along one edge.
 */
const MIN_SUBJECT = 0.05;
const MAX_SUBJECT = 0.6;

/**
 * And where it has to reach. The crop centres the bottle, so a real one runs
 * from near the top of the frame to near the bottom. This is the check that
 * catches the worst outcome: a pale label the same colour as the wall behind
 * it lets the fill in through the middle, the bottom half of the bottle
 * detaches, and what survives is a bottle with a bite out of it.
 */
const MAX_TOP = 0.22;
const MIN_BOTTOM = 0.85;

/**
 * And how smooth its outline has to be. Measured across synthetic scenes —
 * plain, gradient, wood grain, clutter — a clean bottle scores 5.2 to 5.6, and
 * a bottle with a patterned surface fused to it scores 12.2. Eight sits in the
 * gap. This is the only one of these checks that catches a background busy
 * enough to bond to the bottle: the area, the height and the position all look
 * perfectly ordinary when that happens.
 */
const MAX_ROUGHNESS = 8;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * The crop rectangle: the bottle, plus a margin, widened to 4:5.
 *
 * Bottles are tall and the frame is tall, so in practice this adds width. It
 * stays inside the photo — a box pushed against an edge slides back in rather
 * than being clipped, which keeps the bottle whole even when it was shot tight.
 */
export function cropFor(
  box: Box,
  photoWidth: number,
  photoHeight: number,
): { left: number; top: number; width: number; height: number } {
  const bottle = {
    left: clamp(box.x, 0, 1) * photoWidth,
    top: clamp(box.y, 0, 1) * photoHeight,
    width: clamp(box.width, 0.01, 1) * photoWidth,
    height: clamp(box.height, 0.01, 1) * photoHeight,
  };

  const pad = Math.max(bottle.width, bottle.height) * PADDING;
  let width = bottle.width + pad * 2;
  let height = bottle.height + pad * 2;

  // Widen or heighten to 4:5, whichever the box is short of.
  const target = OUT_WIDTH / OUT_HEIGHT;
  if (width / height < target) width = height * target;
  else height = width / target;

  // Shrink to fit if the padded box is now bigger than the photo.
  const shrink = Math.min(1, photoWidth / width, photoHeight / height);
  width *= shrink;
  height *= shrink;

  const centreX = bottle.left + bottle.width / 2;
  const centreY = bottle.top + bottle.height / 2;

  return {
    left: Math.round(clamp(centreX - width / 2, 0, photoWidth - width)),
    top: Math.round(clamp(centreY - height / 2, 0, photoHeight - height)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function distance(pixels: Buffer, a: number, b: number): number {
  const dr = pixels[a] - pixels[b];
  const dg = pixels[a + 1] - pixels[b + 1];
  const db = pixels[a + 2] - pixels[b + 2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Everything reachable from the edge of the frame without crossing an edge.
 *
 * Returns one byte per pixel: 0 for background, 255 for the subject. The
 * caller decides whether to believe it — see `fraction`.
 */
export function fillFromEdges(
  pixels: Buffer,
  width: number,
  height: number,
): { alpha: Uint8Array; fraction: number } {
  const count = width * height;
  const background = new Uint8Array(count);
  // The colour each run started from, so a long drift can be cut off.
  const origin = new Int32Array(count);
  const stack = new Int32Array(count);
  let top = 0;
  let filled = 0;

  function seed(index: number) {
    if (background[index]) return;
    background[index] = 1;
    origin[index] = index * 3;
    stack[top++] = index;
    filled += 1;
  }

  for (let x = 0; x < width; x += 1) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  while (top > 0) {
    const index = stack[--top];
    const from = index * 3;
    const start = origin[index];
    const x = index % width;
    const y = (index - x) / width;

    for (let side = 0; side < 4; side += 1) {
      const nx = x + (side === 0 ? -1 : side === 1 ? 1 : 0);
      const ny = y + (side === 2 ? -1 : side === 3 ? 1 : 0);
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

      const next = ny * width + nx;
      if (background[next]) continue;

      const at = next * 3;
      if (distance(pixels, at, from) > STEP_TOLERANCE) continue;
      if (distance(pixels, at, start) > DRIFT_TOLERANCE) continue;

      background[next] = 1;
      origin[next] = start;
      stack[top++] = next;
      filled += 1;
    }
  }

  const alpha = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    alpha[index] = background[index] ? 0 : 255;
  }
  return { alpha, fraction: filled / count };
}

/**
 * The biggest connected piece of the subject, and nothing else.
 *
 * A flood fill stops at every edge it meets, so on a worktop with a pepper
 * grinder and a set of keys on it the "subject" comes back as the bottle plus
 * the grinder plus the keys, all of which would be composited onto the paper
 * looking like litter. The bottle is the largest thing in a frame that was
 * just cropped to the bottle, so keeping one blob and dropping the rest is
 * both the tidiest output and the most reliable thing to measure.
 */
export function largestBlob(
  alpha: Uint8Array,
  width: number,
  height: number,
): { alpha: Uint8Array; area: number; top: number; bottom: number } {
  const count = width * height;
  const seen = new Uint8Array(count);
  const queue = new Int32Array(count);
  const members = new Int32Array(count);

  let best = { area: 0, top: height - 1, bottom: 0, pixels: new Int32Array(0) };

  for (let start = 0; start < count; start += 1) {
    if (seen[start] || alpha[start] < 128) continue;

    let head = 0;
    let tail = 0;
    let size = 0;
    let top = height;
    let bottom = 0;

    seen[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      members[size++] = index;

      const x = index % width;
      const y = (index - x) / width;
      if (y < top) top = y;
      if (y > bottom) bottom = y;

      for (let side = 0; side < 4; side += 1) {
        const nx = x + (side === 0 ? -1 : side === 1 ? 1 : 0);
        const ny = y + (side === 2 ? -1 : side === 3 ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

        const next = ny * width + nx;
        if (seen[next] || alpha[next] < 128) continue;
        seen[next] = 1;
        queue[tail++] = next;
      }
    }

    if (size > best.area) {
      best = { area: size, top, bottom, pixels: members.slice(0, size) };
    }
  }

  const kept = new Uint8Array(count);
  for (const index of best.pixels) kept[index] = 255;
  return { alpha: kept, area: best.area, top: best.top, bottom: best.bottom };
}

/**
 * How ragged the subject's outline is: its perimeter over the square root of
 * its area, which is scale-free — a shape twice as big scores the same.
 *
 * A bottle is a smooth silhouette and scores around five. A bottle with the
 * pattern of a tablecloth welded to its sides has several times the perimeter
 * for the same area, and this is the only cheap measure that tells them apart:
 * the area, the height and the position all look perfectly reasonable in both.
 */
export function roughnessOf(alpha: Uint8Array, width: number, height: number): number {
  let area = 0;
  let edge = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (alpha[index] < 128) continue;
      area += 1;

      const onEdge =
        x === 0 ||
        y === 0 ||
        x === width - 1 ||
        y === height - 1 ||
        alpha[index - 1] < 128 ||
        alpha[index + 1] < 128 ||
        alpha[index - width] < 128 ||
        alpha[index + width] < 128;
      if (onEdge) edge += 1;
    }
  }

  return area === 0 ? Infinity : edge / Math.sqrt(area);
}

/** The lowest row holding any of the subject, for standing a shadow under it. */
export function baseOf(alpha: Uint8Array, width: number, height: number): number {
  for (let y = height - 1; y >= 0; y -= 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (alpha[row + x] > 127) return y;
    }
  }
  return height - 1;
}

/**
 * The photo, cropped to the bottle and — when asked, and when it works —
 * standing on the app's own paper instead of your kitchen.
 */
export async function tidyBottle(
  original: Buffer,
  box: Box | null,
  { cutOut }: { cutOut: boolean },
): Promise<Tidied> {
  const sharp = (await import("sharp")).default;

  // rotate() with no argument applies the EXIF orientation, which phones set
  // rather than writing the pixels the right way up.
  const upright = await sharp(original).rotate().toBuffer();
  const meta = await sharp(upright).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("That image had no readable size.");

  const framed = sharp(upright);
  if (box) framed.extract(cropFor(box, width, height));

  const cropped = await framed
    .resize(OUT_WIDTH, OUT_HEIGHT, { fit: "cover", position: "centre" })
    .toBuffer();

  const asJpeg = async (buffer: Buffer) =>
    sharp(buffer).jpeg({ quality: 86, mozjpeg: true }).toBuffer();

  if (!cutOut) {
    return { jpeg: await asJpeg(cropped), cutOut: false, note: null };
  }

  const pixels = await sharp(cropped).removeAlpha().raw().toBuffer();
  const filled = fillFromEdges(pixels, OUT_WIDTH, OUT_HEIGHT);
  const blob = largestBlob(filled.alpha, OUT_WIDTH, OUT_HEIGHT);

  const share = blob.area / (OUT_WIDTH * OUT_HEIGHT);
  const top = blob.top / OUT_HEIGHT;
  const bottom = blob.bottom / OUT_HEIGHT;
  const roughness = roughnessOf(blob.alpha, OUT_WIDTH, OUT_HEIGHT);

  /*
   * The pipeline checking its own work. Nothing here knows what a bottle looks
   * like, but it knows the shape of the answer: one tall object, holding a
   * decent but not overwhelming share of a frame that was cropped to it. A
   * fill that never got going leaves the whole room as the subject; one that
   * escaped through a soft edge leaves a sliver. Both come back as a crop.
   */
  const busy = share > MAX_SUBJECT || roughness > MAX_ROUGHNESS;
  if (busy || share < MIN_SUBJECT || top > MAX_TOP || bottom < MIN_BOTTOM) {
    return {
      jpeg: await asJpeg(cropped),
      cutOut: false,
      note: busy
        ? "The background was too busy to remove cleanly, so the photo was only cropped."
        : "The bottle couldn't be separated from the background, so the photo was only cropped.",
    };
  }

  const alpha = blob.alpha;

  /*
   * A hair of blur on the mask stops the cut edge looking like scissors.
   *
   * toColourspace("b-w") is not decoration. Blurring a one-channel raw buffer
   * hands back three channels — sharp promotes greyscale to sRGB on the way
   * through — and joining that as if it were one channel lays the alpha down
   * at a third of the stride, which banded every bottle with horizontal
   * stripes. Pinning the colourspace keeps one byte per pixel.
   */
  const softened = await sharp(Buffer.from(alpha), {
    raw: { width: OUT_WIDTH, height: OUT_HEIGHT, channels: 1 },
  })
    .blur(1.2)
    .toColourspace("b-w")
    .raw()
    .toBuffer();

  const subject = await sharp(pixels, {
    raw: { width: OUT_WIDTH, height: OUT_HEIGHT, channels: 3 },
  })
    .joinChannel(softened, { raw: { width: OUT_WIDTH, height: OUT_HEIGHT, channels: 1 } })
    .png()
    .toBuffer();

  /*
   * A shadow, because a cutout with none reads as a mistake rather than a
   * decision — the bottle looks pasted on. Under the base of the bottle, wide
   * and very soft, at the opacity of a lit room rather than a studio.
   */
  const base = baseOf(alpha, OUT_WIDTH, OUT_HEIGHT);
  const shadow = await sharp(
    Buffer.from(
      `<svg width="${OUT_WIDTH}" height="${OUT_HEIGHT}">
         <ellipse cx="${OUT_WIDTH / 2}" cy="${Math.min(base + 6, OUT_HEIGHT - 12)}"
                  rx="${OUT_WIDTH * 0.19}" ry="14" fill="rgba(40,28,26,0.20)" />
       </svg>`,
    ),
  )
    .blur(12)
    .png()
    .toBuffer();

  const standing = await sharp({
    create: {
      width: OUT_WIDTH,
      height: OUT_HEIGHT,
      channels: 3,
      background: PAPER,
    },
  })
    .composite([{ input: shadow }, { input: subject }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  return { jpeg: standing, cutOut: true, note: null };
}
