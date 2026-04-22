import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";

type Params = { m: string };

function parseMultiplier(raw: string): number | null {
  const cleaned = raw.replace(/x$/i, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 10000) return null;
  return n;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { m } = await params;
  const mult = parseMultiplier(m);
  if (mult === null) return {};
  const title = `I hit ${mult.toFixed(2)}x on SPACESHIBA`;
  const description =
    "$SPACESHIBA · All fees go to charity. #ASTROID #CANCER #RESEARCH";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function WinPage() {
  return <HomeClient />;
}
