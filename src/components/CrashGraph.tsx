"use client";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { multiplierAt } from "@/lib/crash";
import type { Phase } from "@/lib/useMultiplayerGame";
import { Flame } from "./Flame";

// Astroid keyframes — x = radius - radius·cos³(s), y = -radius·sin³(s).
// Starting point is the shiba's crash position (0,0); the curve traces a full
// astroid centered to the right and above, so the shiba ricochets through all
// four cusps before returning and fading out.
const ASTROID_STEPS = 64;
const ASTROID_RADIUS = 140;
const ASTROID_X: number[] = [];
const ASTROID_Y: number[] = [];
for (let i = 0; i <= ASTROID_STEPS; i++) {
  const s = (i / ASTROID_STEPS) * Math.PI * 2;
  const c = Math.cos(s);
  const sn = Math.sin(s);
  ASTROID_X.push(ASTROID_RADIUS - ASTROID_RADIUS * c * c * c);
  ASTROID_Y.push(-ASTROID_RADIUS * sn * sn * sn);
}

const VB_W = 1000;
const VB_H = 600;
const PAD_L = 70;
const PAD_R = 50;
const PAD_T = 40;
const PAD_B = 60;
const GRAPH_W = VB_W - PAD_L - PAD_R;
const GRAPH_H = VB_H - PAD_T - PAD_B;

const SHIBA_ASPECT = "209 / 408";
const GROWTH = 1.0718;
const LN_GROWTH = Math.log(GROWTH);

type Props = {
  phase: Phase;
  multiplier: number;
  elapsedMs: number;
  bettingMsLeft: number;
  crashPoint: number | null;
};

function niceYTicks(yMax: number): number[] {
  const span = yMax - 1;
  const raw = span / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step =
    norm < 1.5 ? 1 * mag : norm < 3.5 ? 2 * mag : norm < 7.5 ? 5 * mag : 10 * mag;
  const ticks: number[] = [];
  for (let v = 1; v <= yMax + 1e-6; v += step) ticks.push(v);
  return ticks;
}

function niceXTicks(xMaxMs: number): number[] {
  const xMax = xMaxMs / 1000;
  const step = xMax < 12 ? 2 : xMax < 30 ? 5 : xMax < 60 ? 10 : 15;
  const ticks: number[] = [];
  for (let v = step; v <= xMax + 1e-6; v += step) ticks.push(v * 1000);
  return ticks;
}

export function CrashGraph({
  phase,
  multiplier,
  elapsedMs,
  bettingMsLeft,
  crashPoint,
}: Props) {
  const xMaxMs = Math.max(10000, elapsedMs * 1.25);
  const yMax = Math.max(2, multiplier * 1.2);

  const pathD = useMemo(() => {
    if (phase === "betting") return "";
    const steps = 64;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * elapsedMs;
      const m = multiplierAt(t);
      const x = PAD_L + (t / xMaxMs) * GRAPH_W;
      const y = PAD_T + GRAPH_H - ((m - 1) / (yMax - 1)) * GRAPH_H;
      pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return pts.join(" ");
  }, [phase, elapsedMs, xMaxMs, yMax]);

  const tipX = PAD_L + (elapsedMs / xMaxMs) * GRAPH_W;
  const tipY = PAD_T + GRAPH_H - ((multiplier - 1) / (yMax - 1)) * GRAPH_H;
  const tipLeftPct = (tipX / VB_W) * 100;
  const tipTopPct = (tipY / VB_H) * 100;

  const dmPerMs = (LN_GROWTH / 1000) * multiplier;
  const dxPerMs = GRAPH_W / xMaxMs;
  const dyPerMs = -(GRAPH_H / (yMax - 1)) * dmPerMs;
  const slopeVB = dyPerMs / dxPerMs;
  const tangentAbove = (Math.atan(-slopeVB) * 180) / Math.PI;
  const tiltDeg = Math.max(0, Math.min(38, (90 - tangentAbove) * 0.38));

  const flameIntensity =
    phase === "flying"
      ? Math.min(1.6, 0.8 + (multiplier - 1) * 0.12)
      : phase === "betting"
        ? 0.35
        : 0.2;

  const yTicks = niceYTicks(yMax);
  const xTicks = niceXTicks(xMaxMs);

  const xToPct = (ms: number) =>
    ((PAD_L + (ms / xMaxMs) * GRAPH_W) / VB_W) * 100;
  const yToPct = (v: number) =>
    ((PAD_T + GRAPH_H - ((v - 1) / (yMax - 1)) * GRAPH_H) / VB_H) * 100;

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="trailGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff4a00" stopOpacity="0" />
            <stop offset="45%" stopColor="#ff4a00" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffb400" stopOpacity="1" />
          </linearGradient>
          <filter id="trailGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {yTicks.map((v) => {
          const y = PAD_T + GRAPH_H - ((v - 1) / (yMax - 1)) * GRAPH_H;
          return (
            <line
              key={`gy-${v}`}
              x1={PAD_L}
              y1={y}
              x2={PAD_L + GRAPH_W}
              y2={y}
              stroke="rgba(244,236,216,0.08)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {xTicks.map((v) => {
          const x = PAD_L + (v / xMaxMs) * GRAPH_W;
          return (
            <line
              key={`gx-${v}`}
              x1={x}
              y1={PAD_T}
              x2={x}
              y2={PAD_T + GRAPH_H}
              stroke="rgba(244,236,216,0.08)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* axes: thick ink lines */}
        <line
          x1={PAD_L}
          y1={PAD_T}
          x2={PAD_L}
          y2={PAD_T + GRAPH_H}
          stroke="rgba(244,236,216,0.55)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={PAD_L}
          y1={PAD_T + GRAPH_H}
          x2={PAD_L + GRAPH_W}
          y2={PAD_T + GRAPH_H}
          stroke="rgba(244,236,216,0.55)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />

        {pathD && (
          <>
            <path
              d={pathD}
              fill="none"
              stroke="#ff4a00"
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.35}
              filter="url(#trailGlow)"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={pathD}
              fill="none"
              stroke="url(#trailGrad)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={pathD}
              fill="none"
              stroke="#fff4d0"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {yTicks.map((v) => (
        <div
          key={`yl-${v}`}
          className="absolute text-ink/70 text-xs sm:text-sm md:text-base pointer-events-none tabular-nums"
          style={{
            fontFamily: "var(--font-hand)",
            left: 0,
            right: `calc(100% - ${(PAD_L / VB_W) * 100}% + 8px)`,
            top: `${yToPct(v)}%`,
            transform: "translateY(-50%)",
            textAlign: "right",
            paddingRight: "4px",
          }}
        >
          {v.toFixed(v < 10 ? 1 : 0)}x
        </div>
      ))}
      {xTicks.map((v) => (
        <div
          key={`xl-${v}`}
          className="absolute text-ink/70 text-xs sm:text-sm md:text-base pointer-events-none tabular-nums"
          style={{
            fontFamily: "var(--font-hand)",
            left: `${xToPct(v)}%`,
            top: `${((PAD_T + GRAPH_H) / VB_H) * 100}%`,
            transform: "translate(-50%, 6px)",
          }}
        >
          {Math.round(v / 1000)}s
        </div>
      ))}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
        <StatusText
          phase={phase}
          multiplier={multiplier}
          crashPoint={crashPoint}
          bettingMsLeft={bettingMsLeft}
        />
      </div>

      <ShibaPilot
        phase={phase}
        leftPct={tipLeftPct}
        topPct={tipTopPct}
        tiltDeg={tiltDeg}
        flameIntensity={flameIntensity}
        parkedLeftPct={(PAD_L / VB_W) * 100}
        parkedTopPct={((PAD_T + GRAPH_H) / VB_H) * 100}
      />
    </div>
  );
}

function StatusText({
  phase,
  multiplier,
  crashPoint,
  bettingMsLeft,
}: {
  phase: Phase;
  multiplier: number;
  crashPoint: number | null;
  bettingMsLeft: number;
}) {
  if (phase === "betting") {
    return (
      <div className="text-center">
        <div
          className="text-ink/70 text-xs sm:text-sm md:text-base uppercase tracking-[0.2em]"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        >
          next launch in
        </div>
        <div
          className="text-ink text-5xl sm:text-7xl md:text-8xl leading-none tabular-nums"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          {Math.ceil(bettingMsLeft / 1000)}
        </div>
      </div>
    );
  }
  if (phase === "crashed") {
    return (
      <motion.div
        initial={{ opacity: 0.7 }}
        animate={{ opacity: [0.7, 1] }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div
          className="text-danger text-5xl sm:text-7xl md:text-9xl leading-none tabular-nums"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            textShadow:
              "0 0 14px rgba(226,20,20,0.4), 0 0 28px rgba(226,20,20,0.2)",
          }}
        >
          {crashPoint?.toFixed(2)}x
        </div>
        <div
          className="text-ink text-xl sm:text-2xl md:text-4xl -mt-1 uppercase tracking-widest"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        >
          // crashed
        </div>
      </motion.div>
    );
  }
  return (
    <div
      className="text-ink text-6xl sm:text-8xl md:text-9xl leading-none tabular-nums"
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        textShadow:
          "0 0 12px rgba(255,74,0,0.35), 0 0 26px rgba(255,74,0,0.18)",
      }}
    >
      {multiplier.toFixed(2)}x
    </div>
  );
}

function ShibaPilot({
  phase,
  leftPct,
  topPct,
  tiltDeg,
  flameIntensity,
  parkedLeftPct,
  parkedTopPct,
}: {
  phase: Phase;
  leftPct: number;
  topPct: number;
  tiltDeg: number;
  flameIntensity: number;
  parkedLeftPct: number;
  parkedTopPct: number;
}) {
  const left = phase === "betting" ? parkedLeftPct : leftPct;
  const top = phase === "betting" ? parkedTopPct : topPct;
  const rot = phase === "betting" ? 0 : tiltDeg;

  return (
    <div
      className="absolute select-none pointer-events-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: "clamp(34px, 5.5vw, 64px)",
        aspectRatio: SHIBA_ASPECT,
        transform: "translate(-50%, -88%)",
        zIndex: 30,
      }}
    >
      {phase === "crashed" ? (
        <motion.div
          className="w-full h-full relative"
          style={{ transformOrigin: "50% 88%" }}
          initial={{ x: 0, y: 0, rotate: rot, opacity: 1, scale: 1 }}
          animate={{
            x: ASTROID_X,
            y: ASTROID_Y,
            rotate: rot + 540,
            opacity: [1, 0.95, 0.7, 0.35, 0],
            scale: [1, 0.95, 0.78, 0.5, 0.22],
          }}
          transition={{ duration: 3.2, ease: "linear" }}
        >
          <img
            src="/shiba.png"
            alt=""
            draggable={false}
            className="w-full h-full select-none relative z-10"
          />
        </motion.div>
      ) : (
        <div
          className="w-full h-full relative"
          style={{
            transform: `rotate(${rot}deg)`,
            transformOrigin: "50% 88%",
            transition: "transform 0.1s linear",
          }}
        >
          <img
            src="/shiba.png"
            alt=""
            draggable={false}
            className="w-full h-full select-none relative z-10"
          />
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "78%",
              transform: "translate(-50%, 0)",
              width: "72%",
              aspectRatio: "0.55",
              zIndex: 5,
            }}
          >
            <Flame intensity={flameIntensity} />
          </div>
        </div>
      )}
    </div>
  );
}
