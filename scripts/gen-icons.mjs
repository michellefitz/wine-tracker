#!/usr/bin/env node
/**
 * Generates the PWA icons (a wine glass on the app's background colour) so the
 * repo doesn't need binary assets checked in by hand.
 *
 *   npm run icons
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const BG = [0x14, 0x10, 0x10];
const GLASS = [0xe8, 0xdc, 0xd6];
const WINE = [0xa0, 0x1f, 0x45];

/** Is normalised point (x, y) inside the wine glass silhouette? */
function inGlass(x, y) {
  const dx = x - 0.5;

  // Bowl: the lower half of a disc, with a flat rim across the top.
  const bowlDy = y - 0.34;
  if (bowlDy >= 0 && dx * dx + bowlDy * bowlDy <= 0.2 * 0.2) return true;
  if (y >= 0.315 && y < 0.34 && Math.abs(dx) <= 0.2) return true;

  // Stem.
  if (y >= 0.54 && y <= 0.76 && Math.abs(dx) <= 0.018) return true;

  // Foot.
  const footDy = (y - 0.775) / 0.032;
  if (Math.abs(dx / 0.155) ** 2 + footDy * footDy <= 1) return true;

  return false;
}

/** The liquid sitting in the bowl. */
function inWine(x, y) {
  const dx = x - 0.5;
  const dy = y - 0.34;
  return dy >= 0.09 && dx * dx + dy * dy <= 0.185 * 0.185;
}

function colourAt(x, y) {
  if (inWine(x, y)) return WINE;
  if (inGlass(x, y)) return GLASS;
  return BG;
}

function render(size) {
  const samples = 4; // supersample, then average — cheap anti-aliasing
  const rows = [];

  for (let py = 0; py < size; py++) {
    // One filter byte (0 = none) then RGB triples.
    const row = Buffer.alloc(1 + size * 3);
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const [cr, cg, cb] = colourAt(
            (px + (sx + 0.5) / samples) / size,
            (py + (sy + 0.5) / samples) / size,
          );
          r += cr;
          g += cg;
          b += cb;
        }
      }
      const total = samples * samples;
      const offset = 1 + px * 3;
      row[offset] = Math.round(r / total);
      row[offset + 1] = Math.round(g / total);
      row[offset + 2] = Math.round(b / total);
    }
    rows.push(row);
  }

  return Buffer.concat(rows);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  // bytes 10-12: compression, filter, interlace — all 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(render(size), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  const path = `public/icons/icon-${size}.png`;
  writeFileSync(path, png(size));
  console.log("wrote", path);
}
