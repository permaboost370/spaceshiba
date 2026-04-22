import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

// Digital brutalism: Space Grotesk for display headings (chunky geometric
// sans), Space Mono for everything else (monospace, terminal-y).
const display = Space_Grotesk({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

const hand = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "SPACESHIBA | ASTROID",
  description: "Cash out before the dog goes too far.",
  openGraph: {
    title: "SPACESHIBA | ASTROID",
    description: "Cash out before the dog goes too far.",
    images: [
      {
        url: "/logo.jpg",
        width: 1000,
        height: 1000,
        alt: "Space Shiba astronaut rocket",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SPACESHIBA | ASTROID",
    description: "Cash out before the dog goes too far.",
    images: ["/logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${hand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
