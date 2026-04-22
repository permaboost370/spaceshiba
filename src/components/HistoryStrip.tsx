"use client";
import type { RoundHistory } from "@/lib/useMultiplayerGame";

export function HistoryStrip({ history }: { history: RoundHistory[] }) {
  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 pr-2">
      {history.length === 0 ? (
        <div
          className="text-ink/50 text-sm sm:text-base px-1 uppercase tracking-widest"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        >
          // first round
        </div>
      ) : (
        history.map((r) => {
          const color =
            r.crashPoint < 1.5
              ? "text-danger border-danger"
              : r.crashPoint < 3
                ? "text-ink border-ink"
                : "text-flame border-flame";
          return (
            <div
              key={r.nonce}
              className={`shrink-0 px-2.5 py-0.5 border-2 bg-surface text-base sm:text-lg tabular-nums ${color}`}
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
              title={`round ${r.nonce} · ${r.hash.slice(0, 12)}… · ${r.winners} winners`}
            >
              {r.crashPoint.toFixed(2)}x
            </div>
          );
        })
      )}
    </div>
  );
}
