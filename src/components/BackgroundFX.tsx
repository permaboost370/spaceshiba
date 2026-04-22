"use client";
import type { Phase } from "@/lib/useMultiplayerGame";
import { Moon } from "./Moon";

// Brutalist background: cream graph-paper grid + hand-drawn moon in the
// upper right + warm ambient glow that intensifies with the multiplier.
type Props = {
  phase: Phase;
  multiplier: number;
};

export function BackgroundFX({ phase, multiplier }: Props) {
  const glowOpacity = Math.min(0.4, 0.1 + (multiplier - 1) * 0.025);
  const glowSize = 45 + Math.min(40, (multiplier - 1) * 4);
  const crashFlash = phase === "crashed";

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none graph-paper"
      aria-hidden
    >
      {/* Moon — parked in the upper right, partially off-screen so it feels
          like it's peeking into frame. */}
      <div
        className="absolute"
        style={{
          top: "clamp(-4vmin, -3vmin, 0vmin)",
          right: "clamp(-6vmin, -4vmin, 0vmin)",
          opacity: 0.9,
        }}
      >
        <Moon size="clamp(180px, 34vmin, 460px)" />
      </div>

      {/* Warm ambient glow that heats up with multiplier */}
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "72%",
          width: `${glowSize}vmin`,
          height: `${glowSize}vmin`,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, rgba(255, 74, 0, ${glowOpacity}) 0%, rgba(255, 74, 0, 0) 60%)`,
          transition: "width 0.3s, height 0.3s",
        }}
      />

      {crashFlash && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(255, 85, 85, 0.32) 0%, rgba(255, 85, 85, 0.1) 40%, transparent 75%)",
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
