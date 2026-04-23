"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { AuthStatus, Phase } from "@/lib/useMultiplayerGame";

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
  connected: boolean;
  walletAddress: string | null;
  authStatus: AuthStatus;
  authError: string | null;
  retryAuth: () => void;
  onOpenDeposit?: () => void;
};

const MAX_BET = 500;

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
    <div className="w-full max-w-md mx-auto space-y-2">
      <div
        className="flex justify-between items-baseline text-sm sm:text-base md:text-lg uppercase tracking-widest"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        <span className="text-ink/60">balance</span>
        <span className="text-ink tabular-nums">§ {p.balance.toFixed(2)}</span>
      </div>

      <div className="flex gap-1.5 items-stretch">
        <input
          type="number"
          inputMode="numeric"
          value={p.betInput}
          onChange={(e) =>
            p.setBetInput(
              Math.min(
                MAX_BET,
                Math.max(0, Math.floor(Number(e.target.value) || 0)),
              ),
            )
          }
          disabled={p.activeBet !== null}
          className="flex-1 min-w-0 bg-surface border-2 border-ink px-3 py-1.5 sm:py-2 text-base sm:text-lg text-ink placeholder-ink/40 focus:outline-none disabled:opacity-50 tabular-nums"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          placeholder={`bet (max ${MAX_BET})`}
          min={0}
          max={MAX_BET}
        />
        {[25, 100, 500].map((v) => (
          <button
            key={v}
            onClick={() => p.setBetInput(v)}
            disabled={p.activeBet !== null}
            className="px-2 sm:px-2.5 bg-surface border-2 border-ink text-sm sm:text-base text-ink hover:bg-ink hover:text-bg disabled:opacity-40 transition-colors tabular-nums"
            style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          >
            {v}
          </button>
        ))}
        {p.walletAddress && p.onOpenDeposit && (
          <button
            onClick={p.onOpenDeposit}
            disabled={p.activeBet !== null}
            title="add funds — opens deposit"
            className="px-2 sm:px-2.5 bg-flame text-ink border-2 border-ink text-xs sm:text-sm uppercase tracking-widest hover:bg-ink hover:text-flame disabled:opacity-40 transition-colors"
            style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          >
            + fund
          </button>
        )}
      </div>

      <div className="relative h-12 sm:h-14">
        <AnimatePresence mode="wait">
          {!p.connected ? (
            <motion.div
              key="disconnected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center border-2 border-ink bg-surface text-ink/70 text-base sm:text-lg uppercase tracking-widest"
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
            >
              connecting…
            </motion.div>
          ) : !p.walletAddress ? (
            <motion.div
              key="nowallet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center border-2 border-ink bg-surface text-ink/70 text-sm sm:text-base uppercase tracking-widest"
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
            >
              connect wallet to play
            </motion.div>
          ) : p.authStatus === "signing" ? (
            <motion.div
              key="signing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center border-2 border-ink bg-surface text-ink/70 text-sm sm:text-base uppercase tracking-widest"
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
            >
              check wallet to sign…
            </motion.div>
          ) : p.authStatus === "error" ? (
            <motion.button
              key="autherror"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={p.retryAuth}
              className="absolute inset-0 border-2 border-danger bg-surface text-danger text-sm sm:text-base hover:bg-danger hover:text-bg transition-colors uppercase tracking-widest"
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
              title={p.authError ?? "sign-in failed"}
            >
              sign-in failed — retry
            </motion.button>
          ) : p.authStatus !== "authenticated" ? (
            <motion.div
              key="authidle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center border-2 border-ink bg-surface text-ink/70 text-sm sm:text-base uppercase tracking-widest"
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
            >
              preparing sign-in…
            </motion.div>
          ) : canCashOut ? (
            <motion.button
              key="cashout"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.1 }}
              onClick={p.cashOut}
              className="absolute inset-0 bg-flame text-ink border-2 border-ink shadow-[4px_4px_0_#0a0a0a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0a0a0a] transition-all text-base sm:text-xl md:text-2xl uppercase tracking-wider tabular-nums"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              cash out § {potentialWin.toFixed(2)}
            </motion.button>
          ) : p.cashedOutAt !== null ? (
            <motion.div
              key="cashedout"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.12 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-surface border-2 border-flame text-flame"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              <div className="text-base sm:text-lg md:text-xl uppercase tracking-wider tabular-nums leading-tight">
                out @ {p.cashedOutAt.toFixed(2)}x
              </div>
              <div
                className="text-xs sm:text-sm text-ink/80 uppercase tracking-widest tabular-nums leading-tight"
                style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
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
              className="absolute inset-0 border-2 border-ink bg-surface text-ink text-sm sm:text-base hover:bg-ink hover:text-bg transition-colors uppercase tracking-widest"
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
            >
              bet § {p.activeBet} — cancel ({Math.ceil(p.phaseMsLeft / 1000)}s)
            </motion.button>
          ) : p.phase === "betting" ? (
            <motion.button
              key="bet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={p.placeBet}
              disabled={p.betInput <= 0 || p.betInput > p.balance}
              className="absolute inset-0 bg-ink text-bg border-2 border-ink shadow-[4px_4px_0_#ff4a00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#ff4a00] transition-all text-base sm:text-xl md:text-2xl uppercase tracking-wider disabled:opacity-40 disabled:shadow-none"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              place bet · {Math.ceil(p.phaseMsLeft / 1000)}s
            </motion.button>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center border-2 border-ink bg-surface text-ink/60 text-sm sm:text-base uppercase tracking-widest"
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
            >
              {p.phase === "flying"
                ? "// spectating"
                : "// next round"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
