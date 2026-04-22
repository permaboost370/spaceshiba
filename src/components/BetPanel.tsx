"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { Phase } from "@/lib/useGame";

type Props = {
  phase: Phase;
  balance: number;
  betInput: number;
  setBetInput: (n: number) => void;
  activeBet: number | null;
  cashedOutAt: number | null;
  multiplier: number;
  phaseMsLeft: number;
  placeBet: () => void;
  cashOut: () => void;
  cancelBet: () => void;
};

export function BetPanel(p: Props) {
  const canCashOut =
    p.phase === "flying" && p.activeBet !== null && p.cashedOutAt === null;
  const potentialWin =
    p.activeBet !== null ? p.activeBet * p.multiplier : 0;
  const winAmount =
    p.activeBet !== null && p.cashedOutAt !== null
      ? p.activeBet * p.cashedOutAt
      : 0;

  return (
    <div className="w-full max-w-md mx-auto space-y-2.5 sm:space-y-3">
      <div
        className="flex justify-between items-baseline text-xl sm:text-2xl md:text-3xl"
        style={{ fontFamily: "var(--font-hand)" }}
      >
        <span className="text-paper/70">balance</span>
        <span className="text-paper tabular-nums">§ {p.balance.toFixed(2)}</span>
      </div>

      <div className="flex gap-1.5 sm:gap-2 items-stretch">
        <input
          type="number"
          inputMode="numeric"
          value={p.betInput}
          onChange={(e) =>
            p.setBetInput(Math.max(0, Math.floor(Number(e.target.value) || 0)))
          }
          disabled={p.activeBet !== null}
          className="flex-1 min-w-0 bg-paper/10 border-2 border-paper/40 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xl sm:text-2xl text-paper placeholder-paper/40 focus:outline-none focus:border-paper disabled:opacity-50 tabular-nums"
          style={{ fontFamily: "var(--font-hand)" }}
          placeholder="bet"
          min={0}
        />
        {[25, 100, 250].map((v) => (
          <button
            key={v}
            onClick={() => p.setBetInput(v)}
            disabled={p.activeBet !== null}
            className="px-2.5 sm:px-3 border-2 border-paper/40 rounded-xl text-lg sm:text-xl text-paper hover:bg-paper/10 disabled:opacity-40 transition"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="relative h-16 sm:h-20">
        <AnimatePresence mode="wait">
          {canCashOut ? (
            <motion.button
              key="cashout"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              onClick={p.cashOut}
              className="absolute inset-0 bg-flame text-ink rounded-2xl text-2xl sm:text-3xl md:text-4xl shadow-[4px_4px_0_rgba(245,236,217,0.9)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_rgba(245,236,217,0.9)] transition-all"
              style={{ fontFamily: "var(--font-display)" }}
            >
              cash out § {potentialWin.toFixed(2)}
            </motion.button>
          ) : p.cashedOutAt !== null ? (
            <motion.div
              key="cashedout"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-paper/5 border-2 border-flame rounded-2xl text-flame"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <div className="text-xl sm:text-2xl md:text-3xl">
                out at {p.cashedOutAt.toFixed(2)}x
              </div>
              <div
                className="text-base sm:text-lg text-paper/80 -mt-1"
                style={{ fontFamily: "var(--font-hand)" }}
              >
                won § {winAmount.toFixed(2)}
              </div>
            </motion.div>
          ) : p.phase === "betting" && p.activeBet !== null ? (
            <motion.button
              key="cancel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={p.cancelBet}
              className="absolute inset-0 border-2 border-paper/60 text-paper rounded-2xl text-xl sm:text-2xl hover:bg-paper/10"
              style={{ fontFamily: "var(--font-hand)" }}
            >
              bet placed · cancel ({Math.ceil(p.phaseMsLeft / 1000)}s)
            </motion.button>
          ) : p.phase === "betting" ? (
            <motion.button
              key="bet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={p.placeBet}
              disabled={p.betInput <= 0 || p.betInput > p.balance}
              className="absolute inset-0 bg-paper text-ink rounded-2xl text-2xl sm:text-3xl md:text-4xl shadow-[4px_4px_0_var(--color-flame)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-flame)] transition-all disabled:opacity-40 disabled:shadow-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              place bet ({Math.ceil(p.phaseMsLeft / 1000)}s)
            </motion.button>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center text-paper/50 text-xl sm:text-2xl"
              style={{ fontFamily: "var(--font-hand)" }}
            >
              {p.phase === "flying"
                ? "no bet this round"
                : "next round starting…"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
