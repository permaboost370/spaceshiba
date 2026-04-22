"use client";
import type { Phase } from "@/lib/useMultiplayerGame";

// Brutalist background: branded bg.jpg (SPACESHIBA/ASTROID moon art) under a
// dark overlay, graph-paper grid on top, warm ambient glow that heats up
// with the multiplier.
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
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {/* Branded background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.55,
        }}
      />
      {/* Darkening veil so UI stays readable on all screen sizes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.35) 40%, rgba(10,10,10,0.7) 100%)",
        }}
      />
      {/* Graph-paper grid on top of the bg */}
      <div className="absolute inset-0 graph-paper opacity-60" />

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
