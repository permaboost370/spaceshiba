"use client";
import { useEffect } from "react";
import type { RoundHistory } from "@/lib/useMultiplayerGame";

export function HistoryModal({
  history,
  open,
  onClose,
}: {
  history: RoundHistory[];
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="round history"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <button
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 cursor-default"
      />
      <div
        className="relative brut bg-surface w-full max-w-md max-h-[80vh] flex flex-col"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        <div className="flex items-center justify-between border-b-2 border-ink px-3 py-2">
          <h2
            className="text-ink uppercase tracking-[0.2em] text-sm"
            style={{ fontFamily: "var(--font-display)" }}
          >
            // history
          </h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="w-7 h-7 border-2 border-ink text-ink flex items-center justify-center hover:bg-ink hover:text-bg transition-colors"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {history.length === 0 ? (
            <div className="p-4 text-ink/50 text-sm uppercase tracking-widest">
              // no rounds yet
            </div>
          ) : (
            <ul className="divide-y-2 divide-ink/10">
              {history.map((r) => {
                const color =
                  r.crashPoint < 1.5
                    ? "text-danger"
                    : r.crashPoint < 3
                      ? "text-ink"
                      : "text-flame";
                return (
                  <li
                    key={r.nonce}
                    className="px-3 py-2 flex items-center justify-between gap-3"
                    title={`hash: ${r.hash}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-ink/50 text-[10px] uppercase tracking-[0.2em]">
                        round #{r.nonce}
                      </div>
                      <div className="text-ink/40 text-[10px] truncate tabular-nums">
                        {r.hash.slice(0, 18)}…
                      </div>
                    </div>
                    <div className="text-right text-[10px] uppercase tracking-widest text-ink/55 leading-tight">
                      <div>{r.winners} won</div>
                      <div className="tabular-nums">
                        §{r.totalPaidOut.toFixed(0)}
                      </div>
                    </div>
                    <div
                      className={`text-xl sm:text-2xl tabular-nums shrink-0 ${color}`}
                      style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                    >
                      {r.crashPoint.toFixed(2)}x
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
