"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { MyRoundResult } from "@/lib/useMultiplayerGame";

type Props = {
  open: boolean;
  onClose: () => void;
  walletAddress: string | null;
  name: string;
  onRename: (n: string) => void;
  history: MyRoundResult[];
  balance: number;
};

export function ProfileModal({
  open,
  onClose,
  walletAddress,
  name,
  onRename,
  history,
  balance,
}: Props) {
  const { disconnect } = useWallet();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  if (!open) return null;

  const stats = {
    rounds: history.length,
    wagered: history.reduce((a, b) => a + b.bet, 0),
    paidOut: history.reduce((a, b) => a + b.payout, 0),
    wins: history.filter((h) => h.won).length,
  };
  const net = stats.paidOut - stats.wagered;
  const winRate = stats.rounds > 0 ? stats.wins / stats.rounds : 0;

  const saveName = () => {
    const n = draft.trim().slice(0, 20);
    if (n && n !== name) onRename(n);
    setEditing(false);
  };

  const copyAddr = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="profile"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <button
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 cursor-default"
      />
      <div
        className="relative brut bg-surface w-full max-w-md max-h-[86vh] flex flex-col"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        <div className="flex items-center justify-between border-b-2 border-ink px-3 py-2">
          <h2
            className="text-ink uppercase tracking-[0.2em] text-sm"
            style={{ fontFamily: "var(--font-display)" }}
          >
            // profile
          </h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="w-7 h-7 border-2 border-ink text-ink flex items-center justify-center hover:bg-ink hover:text-bg transition-colors"
          >
            ×
          </button>
        </div>

        {/* identity */}
        <div className="px-3 py-3 border-b-2 border-ink/10 space-y-2">
          <div>
            <div className="text-ink/50 text-[10px] uppercase tracking-[0.2em] mb-1">
              name
            </div>
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setDraft(name);
                    setEditing(false);
                  }
                }}
                maxLength={20}
                className="w-full bg-bg border-2 border-flame px-2 py-1 text-ink text-lg uppercase tracking-wider outline-none"
                style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
                spellCheck={false}
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="w-full text-left border-2 border-ink bg-bg px-2 py-1 text-ink text-lg uppercase tracking-wider hover:border-flame transition-colors"
                style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
                title="click to rename"
              >
                {name || "—"}
              </button>
            )}
          </div>

          <div>
            <div className="text-ink/50 text-[10px] uppercase tracking-[0.2em] mb-1">
              wallet
            </div>
            {walletAddress ? (
              <div className="flex gap-1.5 items-stretch">
                <button
                  onClick={copyAddr}
                  className="flex-1 min-w-0 border-2 border-ink bg-bg px-2 py-1 text-left text-ink text-xs tabular-nums truncate hover:border-flame transition-colors"
                  title="click to copy"
                >
                  {copied ? "copied!" : walletAddress}
                </button>
                <button
                  onClick={() => disconnect()}
                  className="shrink-0 border-2 border-danger text-danger px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-danger hover:text-bg transition-colors"
                  style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
                >
                  disconnect
                </button>
              </div>
            ) : (
              <div className="text-ink/50 text-xs uppercase tracking-widest py-1">
                // wallet not connected
              </div>
            )}
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-4 border-b-2 border-ink/10 text-center">
          <Stat label="balance" value={`§${balance.toFixed(0)}`} />
          <Stat label="rounds" value={String(stats.rounds)} />
          <Stat
            label="win rate"
            value={`${Math.round(winRate * 100)}%`}
          />
          <Stat
            label="net"
            value={`${net >= 0 ? "+" : ""}${net.toFixed(0)}`}
            color={net > 0 ? "text-flame" : net < 0 ? "text-danger" : "text-ink"}
          />
        </div>

        {/* history */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div
            className="px-3 py-2 text-ink/50 text-[10px] uppercase tracking-[0.2em] border-b-2 border-ink/10"
            style={{ fontFamily: "var(--font-display)" }}
          >
            // your rounds
          </div>
          {history.length === 0 ? (
            <div className="p-4 text-ink/50 text-sm uppercase tracking-widest">
              // no rounds yet
            </div>
          ) : (
            <ul className="divide-y-2 divide-ink/10">
              {history.map((r) => (
                <li
                  key={`${r.nonce}-${r.timestamp}`}
                  className="px-3 py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-ink/50 text-[10px] uppercase tracking-[0.2em]">
                      round #{r.nonce}
                    </div>
                    <div className="text-ink/55 text-xs tabular-nums">
                      bet §{r.bet}
                    </div>
                  </div>
                  <div className="text-right text-[10px] uppercase tracking-widest leading-tight">
                    <div className={r.won ? "text-flame" : "text-danger"}>
                      {r.won
                        ? `out @ ${r.cashedOutAt!.toFixed(2)}x`
                        : "lost"}
                    </div>
                    <div className="text-ink/50 tabular-nums">
                      {r.won ? `+${(r.payout - r.bet).toFixed(0)}` : `-${r.bet}`}
                    </div>
                  </div>
                  <div
                    className={`text-lg sm:text-xl tabular-nums shrink-0 ${
                      r.crashPoint < 1.5
                        ? "text-danger"
                        : r.crashPoint < 3
                          ? "text-ink"
                          : "text-flame"
                    }`}
                    style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                  >
                    {r.crashPoint.toFixed(2)}x
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "text-ink",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="py-2 border-r-2 border-ink/10 last:border-r-0">
      <div className="text-ink/50 text-[10px] uppercase tracking-[0.18em] leading-none">
        {label}
      </div>
      <div
        className={`${color} text-base tabular-nums mt-0.5 leading-none`}
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        {value}
      </div>
    </div>
  );
}
