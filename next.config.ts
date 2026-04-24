import type { NextConfig } from "next";

// Baseline hardening headers.
//
// CSP note: the Solana wallet adapter modal uses inline styles and Next.js
// injects small inline hydration scripts, so `'unsafe-inline'` is needed
// for both style-src and script-src. That weakens the XSS protection from
// CSP itself, but the more important wins here are `frame-ancestors 'none'`
// (clickjacking defence in addition to X-Frame-Options) and a bounded
// `connect-src` so a compromised script can't silently exfiltrate to an
// attacker endpoint. Wallet browser extensions (Phantom content scripts)
// bypass page CSP by design, so the connect flow still works.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // fal.media hosts serve generated PFPs (Nano Banana output) shown in
  // the /pfp generator and the /pfp/s share-landing page.
  "img-src 'self' data: blob: https://fal.media https://*.fal.media",
  // https: covers Solana RPC endpoints + og images; wss:/ws: cover the
  // game server's websocket (prod + local dev).
  "connect-src 'self' https: wss: ws://localhost:* ws://127.0.0.1:*",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // The PFP generate route reads fonts/SpaceMono-Bold.ttf at
  // runtime to composite the $SPACESHIBA watermark. Without this
  // tracing hint Vercel doesn't include the TTF in the serverless
  // bundle and the readFileSync fails.
  outputFileTracingIncludes: {
    "/api/pfp/generate": ["./fonts/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
