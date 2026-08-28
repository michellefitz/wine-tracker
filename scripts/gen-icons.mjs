#!/usr/bin/env node
/**
 * Generates the PWA icons from the app's mark.
 *
 *   npm run icons
 *
 * The source is a photograph of the mark foil-blocked on black card, kept at
 * assets/app-icon.jpg. It is a photograph rather than a drawing on purpose —
 * the paper grain and the way the light catches the foil are most of why it
 * looks like something rather than a glyph, and neither survives being traced.
 *
 * The crop is fixed rather than found each run: the mark sits at a known place
 * in that photograph, and a detector that re-derives it every time is a
 * detector that can quietly re-derive it wrong after an innocuous edit. If the
 * source is ever replaced, re-measure and change CROP.
 *
 * The square is sized so the mark fills about 60% of the icon's height, which
 * keeps it inside the middle 80% that Android's maskable icons may crop to.
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const SOURCE = "assets/app-icon.jpg";
const OUT = "public/icons";

/** Measured on assets/app-icon.jpg (704x1530): the mark centres on (353, 761). */
const CROP = { left: 2, top: 411, width: 700, height: 700 };

const SIZES = [192, 512];

mkdirSync(OUT, { recursive: true });

for (const size of SIZES) {
  await sharp(SOURCE)
    .extract(CROP)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/icon-${size}.png`);
  console.log(`wrote ${OUT}/icon-${size}.png`);
}
