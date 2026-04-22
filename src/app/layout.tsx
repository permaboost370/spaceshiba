import type { Metadata } from "next";
import { Caveat_Brush, Caveat } from "next/font/google";
import "./globals.css";

const display = Caveat_Brush({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const hand = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "Crash — to the moon",
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
