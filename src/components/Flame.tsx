"use client";
import { motion } from "framer-motion";

// Pure flame visual — parent controls position + size. Flickers via scale
// animations. `intensity` 0..2 scales brightness + core opacity.
export function Flame({ intensity = 1 }: { intensity?: number }) {
  const brightness = Math.min(1, 0.35 + intensity * 0.4);
  return (
    <motion.div
      className="w-full h-full origin-top"
      style={{ opacity: brightness }}
      animate={{
        scaleY: [1, 1.18, 0.92, 1.22, 0.98, 1.12],
        scaleX: [1, 0.9, 1.08, 0.88, 1.02, 0.96],
      }}
      transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        viewBox="0 0 80 140"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="flameBody" cx="50%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#fff4d0" stopOpacity="1" />
            <stop offset="22%" stopColor="#ffd670" stopOpacity="0.98" />
            <stop offset="50%" stopColor="#ff7a1a" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#ff2a00" stopOpacity="0" />
          </radialGradient>
          <filter id="flameBlur">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id="flameOuter">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <ellipse
          cx="40"
          cy="72"
          rx="36"
          ry="64"
          fill="#ff4a00"
          opacity="0.5"
          filter="url(#flameOuter)"
        />
        <path
          d="M40 6 C 14 46 8 94 40 137 C 72 94 66 46 40 6 Z"
          fill="url(#flameBody)"
        />
        <path
          d="M40 26 C 24 56 22 92 40 122 C 58 92 56 56 40 26 Z"
          fill="#ffe39a"
          opacity="0.85"
          filter="url(#flameBlur)"
        />
        <path
          d="M40 48 C 33 68 32 94 40 114 C 48 94 47 68 40 48 Z"
          fill="#fff6dc"
          opacity="0.95"
        />
      </svg>
    </motion.div>
  );
}
