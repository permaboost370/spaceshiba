"use client";
import type { RoundHistory } from "@/lib/useGame";

export function HistoryStrip({ history }: { history: RoundHistory[] }) {
  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 pr-2">
      {history.length === 0 ? (
        <div
          className="text-paper/40 text-base sm:text-lg px-1"
          style={{ fontFamily: "var(--font-hand)" }}
        >
          first round…
        </div>
      ) : (
        history.map((r) => {
          const color =
            r.crashPoint < 1.5
              ? "text-danger border-danger/50"
              : r.crashPoint < 3
                ? "text-paper border-paper/40"
                : "text-flame border-flame/60";
          return (
            <div
              key={r.nonce}
              className={`shrink-0 px-2.5 py-1 border-2 rounded-lg text-base sm:text-xl tabular-nums ${color}`}
              style={{ fontFamily: "var(--font-hand)" }}
              title={`round ${r.nonce} · ${r.hash.slice(0, 12)}…`}
            >
              {r.crashPoint.toFixed(2)}x
            </div>
          );
        })
      )}
    </div>
  );
}
