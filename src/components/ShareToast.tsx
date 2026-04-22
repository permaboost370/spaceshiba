"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type LastWin = {
  multiplier: number;
  payout: number;
  bet: number;
  id: number;
};

type Props = {
  lastWin: LastWin | null;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 15000;

// Builds the twitter.com/intent/tweet URL. The shared link points at
// /w/<multiplier>?v=<nonce>, which carries a per-win Open Graph card
// that X will unfurl as the tweet's preview image. The nonce is a
// cache-buster — X caches card previews per URL for ~7 days, so a
// fresh nonce per share guarantees X re-fetches and shows the right
// multiplier instead of a stale preview.
function buildTweetUrl(mult: number, nonce: number) {
  const mStr = mult.toFixed(2);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/w/${mStr}?v=${nonce.toString(36)}`;
  const text =
    `Just hit ${mStr}x on $SPACESHIBA 🚀\n` +
    `All fees go to charity.\n`;
  const params = new URLSearchParams({
    text,
    url: shareUrl,
    hashtags: "ASTROID,CANCER,RESEARCH",
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function ShareToast({ lastWin, onDismiss }: Props) {
  useEffect(() => {
    if (!lastWin) return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [lastWin, onDismiss]);

  const handleShare = () => {
    if (!lastWin) return;
    const url = buildTweetUrl(lastWin.multiplier, lastWin.id);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      {lastWin && (
        <motion.div
          key={lastWin.id}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)" }}
        >
          <div
            className="pointer-events-auto w-full max-w-md bg-surface border-2 border-flame shadow-[4px_4px_0_#ff4a00] px-3 py-3 flex items-center gap-3"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            <div className="flex-1 min-w-0">
              <div
                className="text-flame text-xs uppercase tracking-[0.22em] leading-none"
                style={{ fontWeight: 700 }}
              >
                you won
              </div>
              <div
                className="text-ink text-xl sm:text-2xl leading-tight tabular-nums"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                }}
              >
                {lastWin.multiplier.toFixed(2)}x · §{" "}
                {lastWin.payout.toFixed(2)}
              </div>
              <div className="text-ink/60 text-[10px] uppercase tracking-widest leading-tight mt-0.5">
                share the win — all fees go to charity
              </div>
            </div>

            <button
              onClick={handleShare}
              className="shrink-0 bg-ink text-bg border-2 border-ink px-3 py-2 text-sm uppercase tracking-wider hover:bg-flame hover:text-on-flame hover:border-flame transition-colors"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              aria-label="Share on X"
            >
              <span className="flex items-center gap-1.5">
                <XGlyph />
                share
              </span>
            </button>

            <button
              onClick={onDismiss}
              className="shrink-0 text-ink/60 hover:text-ink w-7 h-7 flex items-center justify-center border-2 border-ink/40 hover:border-ink transition-colors text-base leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function XGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      fill="currentColor"
    >
      <path d="M18.244 2H21.5l-7.53 8.61L22.5 22h-6.844l-5.36-6.99L4.1 22H.84l8.06-9.21L.5 2h7.02l4.85 6.41L18.244 2Zm-1.2 18h1.87L7.03 4H5.06l11.984 16Z" />
    </svg>
  );
}
