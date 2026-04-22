// Crops the shiba PNG to a square (the head/torso) and downscales it to a
// favicon-sized PNG at src/app/icon.png. Next.js App Router picks up
// src/app/icon.png automatically.
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "public", "shiba.png");
const OUT = join(__dirname, "..", "src", "app", "icon.png");

const meta = await sharp(SRC).metadata();
const W = meta.width;
const H = meta.height;
// Shiba PNG is ~209×408 (tall). Take a square starting a little below the
// ears so the whole head + shoulders land in the crop.
const side = Math.min(W, H);
const top = Math.max(0, Math.round(H * 0.05));

await sharp(SRC)
  .extract({ left: 0, top, width: side, height: side })
  .resize(256, 256, { fit: "contain", background: { r: 10, g: 10, b: 10, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

const outMeta = await sharp(OUT).metadata();
console.log(`wrote ${OUT} (${outMeta.width}x${outMeta.height})`);
