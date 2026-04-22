import type { Metadata } from "next";
import { Orbitron, VT323 } from "next/font/google";
import "./globals.css";

const display = Orbitron({
  weight: ["700", "900"],
  subsets: ["latin"],
  variable: "--font-display",
});

const hand = VT323({
  weight: "400",
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
