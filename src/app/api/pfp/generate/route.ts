import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { composePrompt, TRAIT_CATEGORIES } from "@/lib/pfpTraits";

export const runtime = "nodejs";
export const maxDuration = 60;

// Single generic error shown to users for any server-side failure
// (fal billing, model error, content policy, timeouts, etc). Real
// cause is always logged via console.error for us to inspect in
// Vercel logs, but the user only ever sees this string.
const GENERIC_ERROR = "Something went wrong. Please try again later.";

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
    console.error("FAL_KEY missing from environment");
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
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
        const url = data?.images?.[0]?.url;
        if (!url) return null;
        return { url, seed: data?.seed ?? seed };
      }),
    );

    const images = results.filter(
      (x): x is { url: string; seed: number } => x !== null,
    );

    if (images.length === 0) {
      console.error("model returned no images", { prompt });
      return NextResponse.json(
        { error: GENERIC_ERROR },
        { status: 502 },
      );
    }

    return NextResponse.json({ images, prompt });
  } catch (e) {
    // Log full fal error detail server-side (auth, quota, content
    // policy, etc) but never leak it to the user — the UI should just
    // say "try again later" instead of exposing billing links or the
    // fact that we even use fal.ai.
    const errAny = e as {
      message?: string;
      status?: number;
      body?: unknown;
    };
    console.error("fal.ai error", {
      status: errAny.status,
      message: errAny.message,
      body: errAny.body,
    });
    return NextResponse.json(
      { error: GENERIC_ERROR },
      { status: 502 },
    );
  }
}
