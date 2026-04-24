"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AstroidMark } from "@/components/AstroidMark";

const LAST_MODE_KEY = "spaceshiba.lastMode";

export function Portal() {
  const [lastMode, setLastMode] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastMode(window.localStorage.getItem(LAST_MODE_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const rememberAnd = (mode: "play" | "pfp") => {
    try {
      window.localStorage.setItem(LAST_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  return (
    <main
      className="relative w-full flex flex-col overflow-hidden bg-bg"
      style={{ height: "100svh" }}
    >
      {/* graph-paper backdrop to match the game */}
      <div className="absolute inset-0 graph-paper opacity-60" />

      <header className="relative z-20 flex items-center gap-2 px-3 pt-2 sm:px-4 sm:pt-3">
        <div className="shrink-0 flex items-center gap-2 px-2 py-1 border-2 border-ink bg-surface">
          <AstroidMark size={20} color="var(--color-flame)" />
          <span
            className="text-ink uppercase tracking-[0.18em] text-xs sm:text-sm leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SPACESHIBA
          </span>
          <span
            className="hidden sm:inline text-ink/45 text-[10px] tracking-[0.2em] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            // CHOOSE YOUR ORBIT
          </span>
        </div>
      </header>

      <div className="relative z-10 flex-1 min-h-0 px-3 sm:px-6 py-4 sm:py-6 flex flex-col md:flex-row gap-4 sm:gap-6">
        <PortalPanel
          href="/play"
          label="PLAY"
          tagline="// cash out before the dog goes too far"
          accent="flame"
          recent={lastMode === "play"}
          onSelect={() => rememberAnd("play")}
          illustration={<PlayIllustration />}
          delay={0}
        />
        <PortalPanel
          href="/pfp"
          label="MAKE PFP"
          tagline="// generate your own spaceshiba"
          accent="ink"
          recent={lastMode === "pfp"}
          onSelect={() => rememberAnd("pfp")}
          illustration={<PfpIllustration />}
          delay={0.08}
        />
      </div>

      <footer
        className="relative z-10 px-3 sm:px-6 pb-3 sm:pb-4 text-ink/40 text-[10px] sm:text-xs uppercase tracking-[0.22em]"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        all fees go to charity · $SPACESHIBA
      </footer>
    </main>
  );
}

function PortalPanel({
  href,
  label,
  tagline,
  accent,
  recent,
  onSelect,
  illustration,
  delay,
}: {
  href: string;
  label: string;
  tagline: string;
  accent: "flame" | "ink";
  recent: boolean;
  onSelect: () => void;
  illustration: React.ReactNode;
  delay: number;
}) {
  const shadow =
    accent === "flame" ? "shadow-[8px_8px_0_#ff4a00]" : "shadow-[8px_8px_0_#f4ecd8]";
  const activeShadow =
    accent === "flame" ? "active:shadow-[4px_4px_0_#ff4a00]" : "active:shadow-[4px_4px_0_#f4ecd8]";

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, delay }}
      className="flex-1 min-h-0"
    >
      <Link
        href={href}
        onClick={onSelect}
        className={`group relative h-full w-full flex flex-col justify-between bg-surface border-2 border-ink ${shadow} ${activeShadow} active:translate-x-[4px] active:translate-y-[4px] transition-all overflow-hidden`}
      >
        {recent && (
          <div
            className="absolute top-3 right-3 z-10 border-2 border-flame text-flame text-[10px] uppercase tracking-[0.22em] px-2 py-1 bg-surface"
            style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          >
            last visit
          </div>
        )}

        <div className="relative flex-1 min-h-0 flex items-center justify-center p-6">
          {illustration}
        </div>

        <div className="relative z-10 border-t-2 border-ink px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-1">
          <div
            className="text-ink text-3xl sm:text-5xl md:text-6xl leading-none tracking-tight group-hover:text-flame transition-colors"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            {label}
          </div>
          <div
            className="text-ink/55 text-[10px] sm:text-xs uppercase tracking-[0.22em]"
            style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          >
            {tagline}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function PlayIllustration() {
  return (
    <svg
      viewBox="0 0 400 240"
      className="w-full max-w-md h-auto"
      aria-hidden
    >
      <defs>
        <linearGradient id="portalTrail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff4a00" stopOpacity="0" />
          <stop offset="50%" stopColor="#ff4a00" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffb400" stopOpacity="1" />
        </linearGradient>
      </defs>
      <line x1="30" y1="30" x2="30" y2="210" stroke="rgba(244,236,216,0.45)" strokeWidth={2} />
      <line x1="30" y1="210" x2="380" y2="210" stroke="rgba(244,236,216,0.45)" strokeWidth={2} />
      <path
        d="M 30 210 C 140 205, 230 180, 380 30"
        fill="none"
        stroke="#ff4a00"
        strokeWidth={18}
        strokeLinecap="round"
        opacity={0.3}
      />
      <path
        d="M 30 210 C 140 205, 230 180, 380 30"
        fill="none"
        stroke="url(#portalTrail)"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path
        d="M 30 210 C 140 205, 230 180, 380 30"
        fill="none"
        stroke="#fff4d0"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.9}
      />
    </svg>
  );
}

function PfpIllustration() {
  return (
    <svg viewBox="0 0 400 240" className="w-full max-w-md h-auto" aria-hidden>
      {/* 3x3 grid of PFP tiles, one lit up */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => {
          const x = 70 + c * 90;
          const y = 15 + r * 75;
          const lit = r === 1 && c === 1;
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={x}
                y={y}
                width={70}
                height={60}
                fill={lit ? "#ff4a00" : "transparent"}
                stroke="rgba(244,236,216,0.75)"
                strokeWidth={2}
              />
              {lit && (
                <g>
                  <circle cx={x + 35} cy={y + 25} r={12} fill="#0a0a0a" />
                  <rect x={x + 20} y={y + 36} width={30} height={16} fill="#0a0a0a" />
                </g>
              )}
              {!lit && (
                <g opacity={0.35}>
                  <circle cx={x + 35} cy={y + 25} r={10} fill="rgba(244,236,216,0.75)" />
                  <rect x={x + 22} y={y + 36} width={26} height={14} fill="rgba(244,236,216,0.75)" />
                </g>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
