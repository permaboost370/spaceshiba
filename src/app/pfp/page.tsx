import type { Metadata } from "next";
import { PfpClient } from "@/components/PfpClient";

export const metadata: Metadata = {
  title: "SPACESHIBA | PFP GENERATOR",
  description: "Generate your own SPACESHIBA PFP.",
};

export default function PfpPage() {
  return <PfpClient />;
}
