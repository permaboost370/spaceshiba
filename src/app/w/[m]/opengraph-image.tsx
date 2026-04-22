import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "SPACESHIBA win";

type Params = { m: string };

function parseMultiplier(raw: string): number {
  const cleaned = raw.replace(/x$/i, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(n, 10000);
}

// Read the shiba.png from /public and return as a data URL. ImageResponse
// runs server-side and needs an absolute reference, so we inline it.
function shibaDataUrl(): string {
  try {
    const buf = readFileSync(path.join(process.cwd(), "public", "shiba.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

// Build an exponential curve that mirrors the in-game feel. We cap the
// vertical climb at ~40% of the chart height so the shiba pilot and the
// big multiplier label both have room to breathe above the curve.
function buildCurve(width: number, height: number) {
  const steps = 48;
  const pts: Array<[number, number]> = [];
  const padL = 60;
  const padR = 80;
  const padT = 220; // leaves headroom above the curve for the shiba
  const padB = 100;
  const w = width - padL - padR;
  const h = height - padT - padB;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const m = Math.pow(8, t);
    const x = padL + t * w;
    const y = padT + h - ((m - 1) / 7) * h;
    pts.push([x, y]);
  }
  const d = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const [ex, ey] = pts[pts.length - 1];
  return {
    d,
    endX: ex,
    endY: ey,
    axisTop: padT,
    axisBottom: padT + h,
    axisLeft: padL,
    axisRight: padL + w,
  };
}

export default async function Image({
  params,
}: {
  params: Promise<Params>;
}) {
  const { m } = await params;
  const mult = parseMultiplier(m);
  const shiba = shibaDataUrl();

  const W = size.width;
  const H = size.height;
  const curve = buildCurve(W, H);

  const ink = "#f4ecd8";
  const bg = "#020204";
  const flame = "#ff4a00";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: bg,
          color: ink,
          fontFamily:
            "ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace",
          position: "relative",
        }}
      >
        {/* faint graph-paper grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(244,236,216,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,236,216,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            display: "flex",
          }}
        />

        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "28px 40px 0 40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 14px",
              border: `3px solid ${ink}`,
              background: "#151515",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                background: flame,
                transform: "rotate(45deg)",
                display: "flex",
              }}
            />
            <div
              style={{
                fontSize: 28,
                letterSpacing: "0.18em",
                fontWeight: 700,
                display: "flex",
              }}
            >
              SPACESHIBA
            </div>
            <div
              style={{
                fontSize: 18,
                color: "rgba(244,236,216,0.45)",
                letterSpacing: "0.2em",
                display: "flex",
              }}
            >
              // ASTROID
            </div>
          </div>
        </div>

        {/* curve + shiba */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
          }}
        >
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff4a00" stopOpacity="0" />
                <stop offset="45%" stopColor="#ff4a00" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ffb400" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* axes */}
            <line
              x1={curve.axisLeft}
              y1={curve.axisTop}
              x2={curve.axisLeft}
              y2={curve.axisBottom}
              stroke="rgba(244,236,216,0.45)"
              strokeWidth={3}
            />
            <line
              x1={curve.axisLeft}
              y1={curve.axisBottom}
              x2={curve.axisRight}
              y2={curve.axisBottom}
              stroke="rgba(244,236,216,0.45)"
              strokeWidth={3}
            />
            {/* curve glow */}
            <path
              d={curve.d}
              fill="none"
              stroke="#ff4a00"
              strokeWidth={28}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.28}
            />
            {/* main curve */}
            <path
              d={curve.d}
              fill="none"
              stroke="url(#trail)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* highlight */}
            <path
              d={curve.d}
              fill="none"
              stroke="#fff4d0"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          </svg>
        </div>

        {/* shiba pilot riding the curve tip */}
        {shiba && (
          <img
            src={shiba}
            width={92}
            height={180}
            style={{
              position: "absolute",
              left: curve.endX - 46,
              top: curve.endY - 160,
              transform: "rotate(30deg)",
              transformOrigin: "50% 88%",
            }}
          />
        )}

        {/* multiplier + charity block, left of the curve tip */}
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: 36,
              letterSpacing: "0.28em",
              color: "rgba(244,236,216,0.6)",
              fontWeight: 700,
              display: "flex",
            }}
          >
            CASHED OUT AT
          </div>
          <div
            style={{
              fontSize: 220,
              fontWeight: 800,
              color: ink,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              textShadow:
                "0 0 30px rgba(255,74,0,0.55), 0 0 60px rgba(255,74,0,0.35)",
              display: "flex",
            }}
          >
            {mult.toFixed(2)}x
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 32,
              letterSpacing: "0.22em",
              color: flame,
              fontWeight: 700,
              display: "flex",
            }}
          >
            ALL FEES GO TO CHARITY
          </div>
        </div>

        {/* bottom tag row */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 40,
            right: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 14,
              fontSize: 26,
              letterSpacing: "0.15em",
              fontWeight: 700,
            }}
          >
            <span style={{ color: flame, display: "flex" }}>$SPACESHIBA</span>
            <span style={{ color: "rgba(244,236,216,0.85)", display: "flex" }}>
              #ASTROID
            </span>
            <span style={{ color: "rgba(244,236,216,0.85)", display: "flex" }}>
              #CANCER
            </span>
            <span style={{ color: "rgba(244,236,216,0.85)", display: "flex" }}>
              #RESEARCH
            </span>
          </div>
          <div
            style={{
              padding: "6px 12px",
              border: `3px solid ${flame}`,
              color: flame,
              fontSize: 22,
              letterSpacing: "0.2em",
              fontWeight: 700,
              display: "flex",
            }}
          >
            WIN
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
