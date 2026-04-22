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
