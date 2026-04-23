import type { Metadata } from "next";
import { Michroma, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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

// Absolute base for og:image / twitter:image. Override with
// NEXT_PUBLIC_SITE_URL in prod so X unfurls point at the real host.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SPACESHIBA | ASTROID",
  description: "Cash out before the dog goes too far.",
  openGraph: {
    title: "SPACESHIBA | ASTROID",
    description: "Cash out before the dog goes too far.",
    images: [
      {
        url: "/bg2.jpg",
        alt: "SPACESHIBA | ASTROID",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SPACESHIBA | ASTROID",
    description: "Cash out before the dog goes too far.",
    images: ["/bg2.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${hand.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
