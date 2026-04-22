// The astroid: x = cos³(t), y = sin³(t). Four-cusp hypocycloid that
// inspired the SpaceX Polaris Dawn mark. Drawn as a filled SVG path on a
// 100×100 viewBox so the caller can size it freely.
export function AstroidMark({
  size = 24,
  className,
  strokeOnly = false,
  color,
}: {
  size?: number;
  className?: string;
  strokeOnly?: boolean;
  color?: string;
}) {
  const a = 46; // inset a bit so strokes don't clip
  const cx = 50;
  const cy = 50;
  const steps = 96;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = cx + a * c * c * c;
    const y = cy - a * s * s * s; // flip Y so cusps are N / E / S / W
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  const d = pts.join(" ") + " Z";
  const fill = color ?? "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      {strokeOnly ? (
        <path
          d={d}
          fill="none"
          stroke={fill}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      ) : (
        <path d={d} fill={fill} />
      )}
    </svg>
  );
}
