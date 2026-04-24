import type { Metadata } from "next";
import { PfpClient } from "@/components/PfpClient";

// Share-receiving page for generated PFPs. The tweet URL carries the
// fal.ai CDN URL in `?img=`; this page emits OG/Twitter meta pointing
// at that URL so X unfurls the actual generated image, while the page
// body renders the normal PFP generator so a human clicking the tweet
// lands on something useful.
//
// Only fal.ai hosts are allowed for the image to prevent attackers
// from crafting unfurls that show arbitrary third-party content
// under our domain.
const ALLOWED_IMG_HOSTS = new Set([
  "fal.media",
  "v2.fal.media",
  "v3.fal.media",
  "v3b.fal.media",
  "fal.ai",
]);

function safeImgUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (!ALLOWED_IMG_HOSTS.has(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const img = safeImgUrl(sp.img);
  const title = "My SPACESHIBA PFP";
  const description =
    "$SPACESHIBA · All fees go to charity. #ASTROID #CANCER #RESEARCH";
  if (!img) {
    return { title, description };
  }
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: img, alt: "SPACESHIBA PFP" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [img],
    },
  };
}

export default function PfpSharePage() {
  return <PfpClient />;
}
