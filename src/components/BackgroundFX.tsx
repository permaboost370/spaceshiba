"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Phase } from "@/lib/useGame";

// Layered background: nebula clouds (drifting soft gradients), sparkle stars
// (slow twinkle, falling speed tied to multiplier), and a radial glow at the
// shiba's location that intensifies with multiplier.
type Props = {
  phase: Phase;
  multiplier: number;
};

type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
  twinkleDur: number;
  twinkleDelay: number;
  driftDur: number;
  driftOffset: number;
};

function SparkleSvg({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size}>
      <path
        d="M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2 Z"
        fill={color}
      />
    </svg>
  );
}

export function BackgroundFX({ phase, multiplier }: Props) {
  const stars = useMemo<Star[]>(() => {
    const seed = 12345;
    let s = seed;
    const rng = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: rng() * 100,
      y: rng() * 110 - 10,
      size: 3 + rng() * 10,
      twinkleDur: 1.2 + rng() * 2.5,
      twinkleDelay: rng() * 3,
      driftDur: 24 + rng() * 16,
      driftOffset: rng(),
    }));
  }, []);

  const driftScale =
    phase === "flying"
      ? Math.max(0.4, Math.min(4, 0.5 + (multiplier - 1) * 0.5))
      : phase === "crashed"
        ? 0.15
        : 0.35;

  // Dynamic glow color: cool (blue/purple) early, hot (orange/yellow) at high mult.
  const glowHue = Math.max(20, 260 - Math.min(240, (multiplier - 1) * 40));
  const glowSat = Math.min(100, 50 + (multiplier - 1) * 8);
  const glowAlpha = Math.min(0.55, 0.18 + (multiplier - 1) * 0.04);
  const glowSize = 30 + Math.min(40, (multiplier - 1) * 4);
  const crashFlash = phase === "crashed";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Deep-space base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 120%, rgba(60,30,90,0.35) 0%, rgba(15,10,30,0.7) 45%, #07060a 85%)",
        }}
      />

      {/* Nebula clouds */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          left: "-10%",
          top: "20%",
          width: "50vw",
          height: "50vw",
          background:
            "radial-gradient(circle, rgba(130,60,200,0.35) 0%, rgba(70,30,130,0.15) 40%, transparent 70%)",
        }}
        animate={{ x: ["-5%", "10%", "-3%"], y: ["0%", "-6%", "4%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          right: "-15%",
          top: "5%",
          width: "45vw",
          height: "45vw",
          background:
            "radial-gradient(circle, rgba(220,80,40,0.28) 0%, rgba(120,30,20,0.12) 45%, transparent 75%)",
        }}
        animate={{ x: ["0%", "-8%", "2%"], y: ["0%", "5%", "-3%"] }}
        transition={{ duration: 55, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          left: "30%",
          bottom: "-15%",
          width: "60vw",
          height: "40vw",
          background:
            "radial-gradient(circle, rgba(40,90,180,0.25) 0%, rgba(20,40,90,0.1) 50%, transparent 75%)",
        }}
        animate={{ x: ["-3%", "6%", "0%"], y: ["0%", "-4%", "2%"] }}
        transition={{ duration: 48, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Stars */}
      {stars.map((st) => (
        <motion.div
          key={st.id}
          className="absolute"
          style={{ left: `${st.x}%`, top: `${st.y}%` }}
          animate={{ y: ["0vh", "110vh"] }}
          transition={{
            duration: st.driftDur / driftScale,
            repeat: Infinity,
            ease: "linear",
            delay: -st.driftOffset * st.driftDur,
          }}
        >
          <motion.div
            animate={{ opacity: [0.15, 0.85, 0.15], scale: [0.7, 1.1, 0.7] }}
            transition={{
              duration: st.twinkleDur,
              repeat: Infinity,
              delay: st.twinkleDelay,
              ease: "easeInOut",
            }}
          >
            <SparkleSvg size={st.size} color="rgba(255,255,255,0.9)" />
          </motion.div>
        </motion.div>
      ))}

      {/* Dynamic ambient glow — heats up with multiplier */}
      <div
        className="absolute rounded-full"
        style={{
          left: "55%",
          top: "35%",
          width: `${glowSize}vmin`,
          height: `${glowSize}vmin`,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, hsla(${glowHue} ${glowSat}% 55% / ${glowAlpha}) 0%, hsla(${glowHue} ${glowSat}% 55% / 0) 65%)`,
          filter: "blur(2px)",
          transition: "width 0.3s, height 0.3s",
        }}
      />

      {/* Crash red flash */}
      {crashFlash && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0.65 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(255,60,60,0.55) 0%, rgba(120,20,20,0.25) 35%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
