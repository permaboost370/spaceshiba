"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

// Brutalist wallet pill. When disconnected shows a "CONNECT" action that
// opens the Solana wallet modal. When connected shows the short address
// and triggers `onOpenProfile` (click the pill → profile modal); you can
// disconnect from inside that modal.
export function WalletButton({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const { connected, publicKey, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (connecting) {
    return (
      <div
        className="shrink-0 flex items-center gap-1.5 px-2 py-1 border-2 border-ink bg-surface text-ink/60 text-[10px] sm:text-xs uppercase tracking-widest"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        connecting…
      </div>
    );
  }

  if (connected && publicKey) {
    const addr = publicKey.toBase58();
    const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;
    return (
      <button
        onClick={onOpenProfile}
        title="open profile"
        className="shrink-0 flex items-center gap-1.5 px-2 py-1 border-2 border-success bg-surface text-success text-[10px] sm:text-xs uppercase tracking-widest hover:bg-success hover:text-ink transition-colors tabular-nums"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        <span className="inline-block w-2 h-2 bg-success" />
        {short}
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="shrink-0 flex items-center gap-1.5 px-2 py-1 border-2 border-flame bg-flame text-ink text-[10px] sm:text-xs uppercase tracking-widest hover:bg-ink hover:text-flame transition-colors"
      style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
    >
      connect wallet
    </button>
  );
}
