"use client";

// Trigger pill — shows the most recent crash point as a quick glance and
// opens the full history modal on click.
export function HistoryButton({
  latest,
  count,
  onClick,
}: {
  latest: number | null;
  count: number;
  onClick: () => void;
}) {
  const color =
    latest === null
      ? "text-ink/50"
      : latest < 1.5
        ? "text-danger"
        : latest < 3
          ? "text-ink"
          : "text-flame";
  return (
    <button
      onClick={onClick}
      className="shrink-0 flex items-center gap-2 px-2.5 py-1 border-2 border-ink bg-surface hover:bg-ink hover:text-bg transition-colors"
      style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      title="open history"
    >
      <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] leading-none">
        history
      </span>
      <span className={`text-sm sm:text-base tabular-nums leading-none ${color}`}>
        {latest !== null ? `${latest.toFixed(2)}x` : "--"}
      </span>
      <span className="text-[10px] leading-none text-ink/50">
        ({count})
      </span>
    </button>
  );
}
