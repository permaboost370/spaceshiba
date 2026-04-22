import type { Metadata } from "next";
import { Michroma, Space_Mono } from "next/font/google";
import "./globals.css";

// Michroma for display — closest Google Fonts match to the Polaris Dawn
// wordmark (wide geometric all-caps). Space Mono for body / labels.
const display = Michroma({
  weight: "400",
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
        url: "/bg.jpg",
        alt: "SPACESHIBA | ASTROID",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SPACESHIBA | ASTROID",
    description: "Cash out before the dog goes too far.",
    images: ["/bg.jpg"],
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
