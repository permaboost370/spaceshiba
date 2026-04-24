import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";
import { composePrompt, TRAIT_CATEGORIES } from "@/lib/pfpTraits";

export const runtime = "nodejs";
export const maxDuration = 60;

// AI models are terrible at clean text, so we composite the
// $SPACESHIBA mark server-side via sharp + SVG. The font is
// bundled with the deploy and embedded in the SVG as a data URL
// so rendering is independent of whatever fonts Vercel's Lambda
// runtime happens to have installed (generic 'monospace' fell
// back to tofu without this).
const WATERMARK = "$SPACESHIBA";
const FONT_BASE64 = (() => {
  try {
    const p = path.join(process.cwd(), "fonts", "SpaceMono-Bold.ttf");
    return readFileSync(p).toString("base64");
  } catch {
    return "";
  }
})();

function watermarkSvg(w: number, h: number): Buffer {
  const fontSize = Math.max(18, Math.round(h * 0.028));
  const pad = Math.round(h * 0.028);
  const fontFace = FONT_BASE64
    ? `@font-face{font-family:'SpaceMono';src:url('data:font/ttf;base64,${FONT_BASE64}') format('truetype');}`
    : "";
  // paint-order + stroke gives the text a cream outline so it stays
  // legible even if the model slips in a dark patch behind it.
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><style>${fontFace}.m{font-family:'SpaceMono',ui-monospace,monospace;font-weight:700;letter-spacing:2px;paint-order:stroke fill;stroke:#f4ecd8;stroke-width:4;fill:#0a0a0a}</style></defs>` +
      `<text class="m" x="${w - pad}" y="${h - pad}" font-size="${fontSize}" text-anchor="end">${WATERMARK}</text>` +
      `</svg>`,
  );
}

// Cheap in-memory rate limit — 6 generations per IP per minute. Resets
// on cold start, which is fine for MVP; swap to Upstash/Redis if abuse
// becomes a real problem.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 6;
const rlBucket = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): { ok: boolean; retryAfterS: number } {
  const now = Date.now();
  const entry = rlBucket.get(ip);
  if (!entry || entry.resetAt < now) {
    rlBucket.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return { ok: true, retryAfterS: 0 };
  }
  if (entry.count >= RL_MAX) {
    return { ok: false, retryAfterS: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { ok: true, retryAfterS: 0 };
}

type Body = {
  traits?: Record<string, string>;
  prompt?: string;
  numImages?: number;
};

// Lock down what the client can send. Unknown trait ids get replaced
// with the category's default.
function sanitize(body: Body) {
  const traits: Record<string, string> = {};
  for (const cat of TRAIT_CATEGORIES) {
    const incoming = body.traits?.[cat.id];
    const match = cat.options.find((o) => o.id === incoming);
    traits[cat.id] = match ? match.id : cat.options[0].id;
  }
  const userPrompt = typeof body.prompt === "string" ? body.prompt.slice(0, 200) : "";
  const numImages = Math.max(
    1,
    Math.min(4, Math.floor(Number(body.numImages) || 1)),
  );
  return { traits, userPrompt, numImages };
}

// Builds an absolute URL for the reference image. fal.ai fetches the
// image by URL, so it has to be publicly reachable.
function refImageUrl(req: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}/ref.jpg`;
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}/ref.jpg`;
}

type FalImageResult = {
  images?: Array<{ url: string }>;
  seed?: number;
};

export async function POST(req: Request) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured" },
      { status: 500 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests, retry in ${rl.retryAfterS}s` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { traits, userPrompt, numImages } = sanitize(body);
  const prompt = composePrompt(traits, userPrompt);
  const imageUrl = refImageUrl(req);

  fal.config({ credentials: process.env.FAL_KEY });

  // Using Bytedance Seedream v4.5 Edit: same API shape as v4, improved
  // lighting/texture/character preservation. Strong reference-driven
  // edits for PFP-style portraits.
  const seeds = Array.from({ length: numImages }, () =>
    Math.floor(Math.random() * 2 ** 31),
  );

  try {
    const results = await Promise.all(
      seeds.map(async (seed) => {
        const r = await fal.subscribe("fal-ai/bytedance/seedream/v4.5/edit", {
          input: {
            prompt,
            image_urls: [imageUrl],
            num_images: 1,
            image_size: { width: 1024, height: 1024 },
            seed,
          },
          logs: false,
        });

        const data = r.data as FalImageResult | undefined;
        const originalUrl = data?.images?.[0]?.url;
        if (!originalUrl) return null;

        // Fetch the generated image, composite $SPACESHIBA on top
        // via sharp (crisp vector text — no AI text-drawing artefacts),
        // and re-upload to fal's storage so the rest of the pipeline
        // (gallery, downloads) keeps working URL-based. If anything in
        // the watermark step fails, fall back to the raw URL so a
        // single bad post-process doesn't kill the whole request.
        try {
          const imgRes = await fetch(originalUrl);
          const imgBuf = Buffer.from(await imgRes.arrayBuffer());
          const meta = await sharp(imgBuf).metadata();
          const w = meta.width ?? 1024;
          const h = meta.height ?? 1024;
          const stamped = await sharp(imgBuf)
            .composite([{ input: watermarkSvg(w, h), top: 0, left: 0 }])
            .jpeg({ quality: 92 })
            .toBuffer();
          const file = new File(
            [new Uint8Array(stamped)],
            `spaceshiba-${seed}.jpg`,
            { type: "image/jpeg" },
          );
          const stampedUrl = await fal.storage.upload(file);
          return { url: stampedUrl, seed: data?.seed ?? seed };
        } catch (e) {
          console.warn("watermark step failed, returning raw url", e);
          return { url: originalUrl, seed: data?.seed ?? seed };
        }
      }),
    );

    const images = results.filter(
      (x): x is { url: string; seed: number } => x !== null,
    );

    if (images.length === 0) {
      return NextResponse.json(
        { error: "Model returned no images" },
        { status: 502 },
      );
    }

    return NextResponse.json({ images, prompt });
  } catch (e) {
    // fal's ApiError exposes `body` and `status` with the server's
    // explanation (auth, quota, content-policy, model-not-found, etc).
    // Without this, every failure surfaces as the generic "Forbidden"
    // string and we can't tell what's actually wrong.
    const errAny = e as {
      message?: string;
      status?: number;
      body?: unknown;
    };
    const body =
      typeof errAny.body === "string"
        ? errAny.body
        : errAny.body
          ? JSON.stringify(errAny.body)
          : undefined;
    const msg =
      [errAny.message, body].filter(Boolean).join(" — ") ||
      "Unknown fal.ai error";
    console.error("fal.ai error", { status: errAny.status, body: errAny.body });
    return NextResponse.json(
      { error: msg, status: errAny.status ?? null },
      { status: 502 },
    );
  }
}
