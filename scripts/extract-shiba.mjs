// Crop the logo to just the dog and key out the black background to produce
// a transparent PNG we can use as the "plane" on the crash curve.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "public", "logo.jpg");
const OUT = join(__dirname, "..", "public", "shiba.png");

const meta = await sharp(SRC).metadata();
const W = meta.width;
const H = meta.height;

// Tight crop around just the dog. Skips the star sparkle at the top and the
// flame photo below, which sit outside the drawing.
const top = Math.round(H * 0.18);
const cropHeight = Math.round(H * 0.41);

const cropped = await sharp(SRC)
  .extract({ left: 0, top, width: W, height: cropHeight })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { data, info } = cropped;
const px = info.channels; // 4 after ensureAlpha

// Alpha-key: anything dark (low luminance) becomes transparent, with a
// smooth ramp near the threshold so edges don't go jagged. This works well
// because the drawing sits on a near-uniform black background.
const LOW = 22;   // fully transparent below
const HIGH = 55;  // fully opaque above

for (let i = 0; i < data.length; i += px) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let a;
  if (lum <= LOW) a = 0;
  else if (lum >= HIGH) a = 255;
  else a = Math.round(((lum - LOW) / (HIGH - LOW)) * 255);
  data[i + 3] = a;
}

// Trim transparent edges so the PNG bounds fit the dog snugly.
await sharp(data, { raw: { width: info.width, height: info.height, channels: px } })
  .png({ compressionLevel: 9 })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toFile(OUT);

const outMeta = await sharp(OUT).metadata();
console.log(`wrote ${OUT} (${outMeta.width}x${outMeta.height})`);
