/**
 * Browser-side image prep. Phone cameras produce 3-8 MB JPEGs; we only need
 * enough resolution to read a label, so downscale before anything touches the
 * network. Keeps uploads fast on mobile data and the database small.
 */

const MAX_EDGE = 1400;
const QUALITY = 0.82;

export async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await loadBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser wouldn't let us process that photo.");

  context.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALITY);
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap honours EXIF orientation, which matters for photos taken
  // in portrait; the <img> fallback is for browsers without it.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> path.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Couldn't read that image."));
      image.src = url;
    });
  } finally {
    // Revoking after decode is safe — the bitmap data is already in memory.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
