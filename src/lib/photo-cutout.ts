/**
 * Lifting the bottle off its background.
 *
 * The country outline behind a bottle only works if the picture the bottle is
 * in has a hole around it. Gemini can't supply one — its image models return
 * flat RGB, with no alpha channel to be had at any setting — and blending the
 * outline over the top instead fails on exactly the pixels that matter most:
 * multiply vanishes over dark glass but ruins a white label, which is the one
 * part of the picture that has to stay clean.
 *
 * So the transparency is made here rather than asked for. A studio shot is the
 * easy case for this: the prompt asks for a flat, seamless ground of a named
 * cream, so the background is a single colour, and everything that isn't that
 * colour is bottle.
 *
 * What comes back is the bottle and its shadow on transparency; the shadow
 * survives because it is a darkening of the ground rather than the ground, so
 * it falls on the opaque side of the same test that removes what it's cast on.
 */

/**
 * Fill and alpha work on a small copy — a couple of hundred pixels is plenty
 * to find the edge of a bottle that fills the frame, and it makes the flood
 * fill trivial where at full size it would be a megapixel of stack.
 *
 * The mask is scaled back up afterwards, which is also what softens it: the
 * upscale interpolates, so the hard per-pixel decision arrives at full size as
 * a gradient a pixel or two wide, and the bottle gets an edge instead of a
 * staircase.
 */
const FILL_WIDTH = 200;

/**
 * How light a ground has to be before this will treat the picture as a studio
 * shot at all.
 *
 * The guard matters more than the cut does. A photograph of a bottle on your
 * own kitchen table has a background that is not one colour, and running this
 * on it would either take nothing out or eat halfway into the table. Refusing
 * is the good outcome there: the caller keeps the original, opaque, and the
 * page looks the way it did before any of this.
 */
const GROUND_MIN_LUMA = 140;

/**
 * How much the ground is allowed to vary across the border before the picture
 * is judged not to have a flat one.
 *
 * Measured as the 95th percentile of the distance from the border's own mean,
 * so JPEG noise and a few stray pixels don't sink it but a vignette, a
 * horizon or a gradient does — all three being things the prompt forbids and
 * a diffusion model occasionally produces anyway.
 */
const GROUND_MAX_SPREAD = 30;

/**
 * How close to the ground colour a pixel has to be to count as ground, derived
 * from how noisy the ground actually is rather than fixed.
 *
 * Fixed was the wrong shape for it. Set wide enough for a grainy JPEG and it
 * eats into pale things — a white capsule, a cream label, a clear bottle of
 * white wine, all of which sit a lot nearer this cream than a red bottle does.
 * Set tight and ordinary compression noise survives as a haze of half-opaque
 * speckle across the whole background. Reading it off the border's own spread
 * gives a clean render a tight threshold and a noisy one a loose one, which is
 * what was wanted from it both times.
 */
function thresholds(spread: number) {
  const solid = Math.min(22, Math.max(8, spread * 2.2 + 5));
  /*
   * ...and a ramp above it, for the shadow. The shadow fades into the ground
   * over many levels, and a hard line drawn somewhere in the middle of that
   * fade shows as a ring around the bottle. Ramping across the same range lets
   * the shadow end the way it ends in the picture.
   */
  return { solid, opaque: solid + 34 };
}

/**
 * How little of the frame the bottle can come out as before the cut is judged
 * to have gone wrong.
 *
 * The one failure worth catching. A bottle only just darker than its
 * background — clear glass, a white wine, a pale capsule filling the neck —
 * is the case where the fill can walk in through a soft edge and take most of
 * the bottle with it, and the result is not a subtle flaw but a hole where the
 * wine was. A studio shot is framed with the bottle centred and whole, so
 * anything that leaves less than this behind has eaten something it shouldn't
 * have, and the original goes out instead.
 */
const LEAST_BOTTLE = 0.06;

/**
 * How wide a leak the silhouette is closed against, in pixels of the small
 * copy.
 *
 * The studio prompt asks for "a gentle highlight down the glass", and it is
 * the highlight that breaks a plain flood fill: on a pale bottle it can come
 * back near enough to white to read as background, and then the fill runs the
 * full height of the bottle down that stripe and out into the label, which is
 * pale too. The result is a bottle with a channel cut down one side and its
 * writing dissolved — the exact failure the blend had, arrived at from the
 * other direction.
 *
 * Closing the silhouette seals any channel narrower than this before the
 * inside is judged. Four pixels at two hundred wide is about a fiftieth of the
 * frame: wider than any highlight, narrower than the gap between a bottle and
 * the edge of its own picture, so nothing real is bridged.
 */
const SEAL = 4;

/**
 * How much of the border has to end up transparent for the cut to be believed.
 *
 * The check that actually catches a bad ground, and it earns its place by
 * being about the result rather than about the picture. A vignette passed
 * every test that looked at the border's colours — its own spread is mild,
 * and it is genuinely light — and then came out as a bottle in an opaque
 * cream oval, because the corners are nothing like the middle of the edges.
 * Asking whether the border is actually gone afterwards catches that, and
 * catches whatever else does the same thing for a different reason.
 */
const BORDER_GONE = 0.95;

/**
 * How much of the frame's height the bottle has to still run down the middle
 * of, once the cut is done.
 *
 * The last thing that can go wrong, and the one the shape work can't fix. A
 * bottle barely darker than its background — clear glass holding a white wine,
 * on cream — is not a leak to be sealed but a picture where the ground and the
 * subject really are the same colour, and the fill takes half the bottle
 * because half the bottle looks like ground. Closing can't help: the channel
 * it opens is as wide as the bottle.
 *
 * A studio shot puts the bottle centred, upright and whole, so a column near
 * the middle of the frame should be bottle for most of its length. When it
 * isn't, something has been eaten, and the picture goes out as it came in.
 * Measured across a band of columns rather than one, so a bottle standing a
 * little off-centre isn't punished for it.
 */
const SPINE = 0.4;

/**
 * How much the bottle's width is allowed to wander down its own body.
 *
 * The last guard, and the one that catches the case where ground and bottle
 * are genuinely the same colour — a pale wine in clear glass on cream, where
 * the fill takes whatever parts of the bottle happen to fall on its side of
 * the line and leaves the rest.
 *
 * Splitting rows in two was the obvious thing to count and it doesn't work:
 * when the fill eats inward from the edge it narrows a row rather than
 * breaking it, so a badly mangled bottle came out at 1.4% split rows against a
 * good one's 0.2%. What does separate them is the width itself. Between the
 * shoulder and the base a bottle is a straight-sided thing, and a cut that
 * worked reports the same width for every row of it — 98 pixels, 562 rows, no
 * variation at all. The mangled one swung between 42 and 89 down the same
 * stretch. So: measure the spread of the body's width, and disbelieve a bottle
 * that changes shape halfway down.
 */
const WANDER = 0.35;

export type CutOut = { data: Buffer; mime: string };

/**
 * The bottle, on nothing. Null when the picture isn't a studio shot — or when
 * anything at all goes wrong, because a cut-out is a decoration and the photo
 * is the point.
 */
export async function cutOut(
  original: Buffer,
  { width, webp }: { width: number; webp: boolean },
): Promise<CutOut | null> {
  try {
    const sharp = (await import("sharp")).default;

    /*
     * Two renders of the same picture: a small one to decide from and a
     * full-size one to cut. Deciding on the small one is not an approximation
     * being tolerated — downscaling averages away the JPEG noise that would
     * otherwise have to be tolerated by a wider threshold, so the small copy
     * is the one with the cleaner answer.
     */
    const probe = await sharp(original)
      .resize({ width: FILL_WIDTH, fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const small = { w: probe.info.width, h: probe.info.height, px: probe.data };
    const ground = readGround(small);
    if (!ground) return null;

    const alpha = maskBackground(small, ground);
    if (!sealSilhouette(small, alpha)) return null;

    const body = await sharp(original)
      .resize({ width, withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const full = { w: body.info.width, h: body.info.height };

    const mask = await sharp(alpha, {
      raw: { width: small.w, height: small.h, channels: 1 },
    })
      .resize(full.w, full.h, { fit: "fill" })
      // A whisker of blur at full size, to take the interpolation's own
      // stair-steps off a diagonal edge. More than this and the bottle starts
      // to look like it was cut out of felt.
      .blur(0.8)
      /*
       * Back to one channel, and not optional. resize on a single-channel raw
       * buffer hands back three — it converts to sRGB on the way through — and
       * joinChannel below takes the buffer at its stated width, so a buffer
       * three times the size it was promised is read as three interleaved
       * images. It produced a mask of hairline stripes, which is a strange
       * enough failure to be worth naming.
       */
      .toColourspace("b-w")
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (mask.info.channels !== 1 || mask.data.length !== full.w * full.h) return null;

    const cut = sharp(body.data, { raw: { width: full.w, height: full.h, channels: 3 } })
      .joinChannel(mask.data, { raw: { width: full.w, height: full.h, channels: 1 } });

    return webp
      ? { data: await cut.webp({ quality: 78, alphaQuality: 90 }).toBuffer(), mime: "image/webp" }
      : { data: await cut.png({ compressionLevel: 8 }).toBuffer(), mime: "image/png" };
  } catch (error) {
    console.error("cutout: could not cut:", error instanceof Error ? error.message : error);
    return null;
  }
}

type Small = { w: number; h: number; px: Buffer };
type Ground = { r: number; g: number; b: number; spread: number };

/**
 * The background colour, read off the border, or null if the border doesn't
 * look like one colour.
 *
 * The border is the right place to read it because it's the one region a
 * studio shot guarantees: the bottle is centred and whole, so every edge pixel
 * is ground. It's also where a gradient shows worst, which is what makes the
 * same sample serve as the test for whether to do this at all.
 */
function readGround(small: Small): Ground | null {
  const edge: number[] = [];
  const push = (x: number, y: number) => edge.push((y * small.w + x) * 3);
  for (let x = 0; x < small.w; x++) {
    push(x, 0);
    push(x, small.h - 1);
  }
  for (let y = 1; y < small.h - 1; y++) {
    push(0, y);
    push(small.w - 1, y);
  }

  let r = 0, g = 0, b = 0;
  for (const i of edge) {
    r += small.px[i];
    g += small.px[i + 1];
    b += small.px[i + 2];
  }
  const mean = { r: r / edge.length, g: g / edge.length, b: b / edge.length, spread: 0 };

  if (0.299 * mean.r + 0.587 * mean.g + 0.114 * mean.b < GROUND_MIN_LUMA) return null;

  const spread = edge.map((i) => distance(small.px, i, mean)).sort((a, b) => a - b);
  mean.spread = spread[Math.floor(spread.length * 0.95)];
  if (mean.spread > GROUND_MAX_SPREAD) return null;

  return mean;
}

/**
 * Opacity for every pixel: 0 on the ground, 255 on the bottle, and a ramp
 * across the shadow's outer edge.
 *
 * A flood fill from the border rather than a threshold over the whole picture,
 * and the difference is the label. A cream ground and a pale label are close
 * enough in colour that any test which looks at pixels one at a time punches
 * holes through the middle of the writing. Reachability doesn't care what
 * colour the label is: it's enclosed by dark glass, nothing connects it to the
 * edge of the frame, so the fill never arrives and it stays whole.
 */
function maskBackground(small: Small, ground: Ground): Buffer {
  const count = small.w * small.h;
  const alpha = Buffer.alloc(count, 255);
  const seen = new Uint8Array(count);
  const stack: number[] = [];

  for (let x = 0; x < small.w; x++) {
    stack.push(x, (small.h - 1) * small.w + x);
  }
  for (let y = 0; y < small.h; y++) {
    stack.push(y * small.w, y * small.w + small.w - 1);
  }

  const { solid, opaque } = thresholds(ground.spread);
  const ramp = opaque - solid;

  while (stack.length) {
    const at = stack.pop()!;
    if (seen[at]) continue;
    seen[at] = 1;

    const gap = distance(small.px, at * 3, ground);
    if (gap >= opaque) continue;

    alpha[at] = gap <= solid ? 0 : Math.round(((gap - solid) / ramp) * 255);

    const x = at % small.w;
    const y = (at - x) / small.w;
    if (x > 0) stack.push(at - 1);
    if (x < small.w - 1) stack.push(at + 1);
    if (y > 0) stack.push(at - small.w);
    if (y < small.h - 1) stack.push(at + small.w);
  }

  return alpha;
}

/**
 * Close the leaks, fill the holes, and say whether the result is believable.
 *
 * Everything up to here decides one pixel at a time whether it looks like
 * background and whether it can be walked to from the edge. That is nearly
 * right and fails in one specific way: a bright highlight down the glass is a
 * corridor of near-background colour running the length of the bottle, and a
 * fill that finds it pours through into the label. What's left is structurally
 * obvious — a bottle with a slot cut in it — but no per-pixel rule can see it,
 * because every pixel it took really was the colour of the ground.
 *
 * So the silhouette is treated as a shape. Closing it seals any channel
 * narrower than SEAL; filling the holes then restores anything the closing has
 * shut in, which is the label, the highlight and any other pale patch that
 * turns out to be surrounded by bottle. The alpha ramp survives on the outside
 * edge, where it belongs — the shadow still fades out — and everything inside
 * the sealed shape is made solid.
 *
 * Returns false if the picture shouldn't be cut after all.
 */
function sealSilhouette(small: Small, alpha: Buffer): boolean {
  const { w, h } = small;
  const count = w * h;

  const solid = new Uint8Array(count);
  for (let i = 0; i < count; i++) solid[i] = alpha[i] >= 128 ? 1 : 0;

  const closed = erode(dilate(solid, w, h, SEAL), w, h, SEAL);

  /*
   * Holes are what the closing was for. Anything transparent that can still be
   * reached from the border is background; anything transparent that can't is
   * inside the bottle, whatever colour it happens to be.
   */
  const outside = new Uint8Array(count);
  const stack: number[] = [];
  const enter = (i: number) => {
    if (!outside[i] && !closed[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    enter(x);
    enter((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    enter(y * w);
    enter(y * w + w - 1);
  }
  while (stack.length) {
    const at = stack.pop()!;
    const x = at % w;
    const y = (at - x) / w;
    if (x > 0) enter(at - 1);
    if (x < w - 1) enter(at + 1);
    if (y > 0) enter(at - w);
    if (y < h - 1) enter(at + w);
  }

  /*
   * Solid inside, ramp at the edge. Eroding before forcing leaves the outermost
   * pixel of the shape at whatever the colour test gave it, so the bottle keeps
   * a soft edge instead of gaining a cut-out's hard one, and the shadow — which
   * is all edge — is left alone entirely.
   */
  const inside = erode(
    Uint8Array.from({ length: count }, (_, i) => (outside[i] ? 0 : 1)),
    w,
    h,
    1,
  );
  let filled = 0;
  for (let i = 0; i < count; i++) {
    if (inside[i]) {
      alpha[i] = 255;
      filled++;
    }
  }

  if (filled < count * LEAST_BOTTLE) return false;
  if (spine(inside, w, h) < h * SPINE) return false;
  if (wander(inside, w, h) > WANDER) return false;

  let border = 0;
  let gone = 0;
  const check = (i: number) => {
    border++;
    if (alpha[i] < 32) gone++;
  };
  for (let x = 0; x < w; x++) {
    check(x);
    check((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    check(y * w);
    check(y * w + w - 1);
  }
  return gone >= border * BORDER_GONE;
}

/** The longest unbroken run of bottle down any column near the middle. */
function spine(inside: Uint8Array, w: number, h: number): number {
  const from = Math.floor(w * 0.45);
  const to = Math.ceil(w * 0.55);
  let best = 0;
  for (let x = from; x < to; x++) {
    let run = 0;
    for (let y = 0; y < h; y++) {
      run = inside[y * w + x] ? run + 1 : 0;
      if (run > best) best = run;
    }
  }
  return best;
}

/**
 * How much the width varies across the straight part of the bottle, as a
 * fraction of the width itself.
 *
 * Measured between two fifths and seven tenths of the way down what was kept,
 * which is the body: below the shoulder, where a real bottle genuinely does
 * change width, and above the base and the shadow, where it genuinely does
 * again.
 */
function wander(inside: Uint8Array, w: number, h: number): number {
  const widths: number[] = [];
  for (let y = 0; y < h; y++) {
    let across = 0;
    for (let x = 0; x < w; x++) across += inside[y * w + x];
    if (across) widths.push(across);
  }
  if (widths.length < 10) return 1;

  const body = widths
    .slice(Math.floor(widths.length * 0.4), Math.floor(widths.length * 0.7))
    .sort((a, b) => a - b);
  if (!body.length) return 1;

  const middle = body[Math.floor(body.length / 2)];
  const narrow = body[Math.floor(body.length * 0.1)];
  const broad = body[Math.floor(body.length * 0.9)];
  return middle ? (broad - narrow) / middle : 1;
}

/** Separable box dilate: a pixel is set if anything within r of it is. */
function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return sweep(mask, w, h, r, true);
}

/** ...and erode, its opposite, for closing a shape back to its own size. */
function erode(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return sweep(mask, w, h, r, false);
}

function sweep(mask: Uint8Array, w: number, h: number, r: number, grow: boolean): Uint8Array {
  const wide = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = grow ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const at = x + d;
        // Off the edge counts as background, so a shape touching the frame
        // isn't eroded away from the side it touches.
        const value = at < 0 || at >= w ? 0 : mask[y * w + at];
        hit = grow ? hit | value : hit & value;
      }
      wide[y * w + x] = hit;
    }
  }

  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = grow ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const at = y + d;
        const value = at < 0 || at >= h ? 0 : wide[at * w + x];
        hit = grow ? hit | value : hit & value;
      }
      out[y * w + x] = hit;
    }
  }
  return out;
}

function distance(px: Buffer, i: number, ground: Ground): number {
  return Math.hypot(px[i] - ground.r, px[i + 1] - ground.g, px[i + 2] - ground.b);
}
