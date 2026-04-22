"use client";
import type { Phase } from "@/lib/useMultiplayerGame";

// Brutalist background: cream base + faint graph-paper grid + a single
// bottom-glow that warms up with multiplier. No animated nebulas — the
// digital-brutalism look wants stillness and information density, not swirl.
type Props = {
  phase: Phase;
  multiplier: number;
};

export function BackgroundFX({ phase, multiplier }: Props) {
  const glowOpacity = Math.min(0.35, 0.08 + (multiplier - 1) * 0.025);
  const glowSize = 45 + Math.min(40, (multiplier - 1) * 4);
  const crashFlash = phase === "crashed";

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none graph-paper"
      aria-hidden
    >
      {/* Warm ambient glow that heats up with multiplier */}
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "70%",
          width: `${glowSize}vmin`,
          height: `${glowSize}vmin`,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, rgba(255, 74, 0, ${glowOpacity}) 0%, rgba(255, 74, 0, 0) 60%)`,
          transition: "width 0.3s, height 0.3s",
        }}
      />

      {/* Crash red flash */}
      {crashFlash && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(226, 20, 20, 0.35) 0%, rgba(226, 20, 20, 0.1) 40%, transparent 75%)",
            animation: "crashflash 0.5s ease-out forwards",
          }}
        />
      )}

      <style>{`
        @keyframes crashflash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
