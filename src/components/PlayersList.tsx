"use client";
import type { PlayerView, Phase } from "@/lib/useMultiplayerGame";

// Shows everyone in the room. On flight: who's still in, who cashed out,
// who's spectating. On crash: winners vs losers.
export function PlayersList({
  players,
  phase,
  selfId,
}: {
  players: PlayerView[];
  phase: Phase;
  selfId: string | null;
}) {
  const sorted = [...players].sort((a, b) => {
    // self first, then players with a bet, then rest
    if (a.id === selfId) return -1;
    if (b.id === selfId) return 1;
    const aHas = a.bet !== null ? 1 : 0;
    const bHas = b.bet !== null ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    return (b.bet ?? 0) - (a.bet ?? 0);
  });

  return (
    <div className="brut-flat bg-surface h-full flex flex-col min-h-0">
      <div
        className="flex items-center justify-between px-3 py-2 border-b-2 border-ink uppercase tracking-widest text-xs sm:text-sm"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        <span>// pilots ({players.length})</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {sorted.length === 0 ? (
          <div
            className="p-3 text-ink/50 text-sm"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            no one connected
          </div>
        ) : (
          <ul className="divide-y-2 divide-ink/10">
            {sorted.map((p) => (
              <PlayerRow
                key={p.id}
                p={p}
                phase={phase}
                isSelf={p.id === selfId}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PlayerRow({
  p,
  phase,
  isSelf,
}: {
  p: PlayerView;
  phase: Phase;
  isSelf: boolean;
}) {
  let status: { text: string; color: string };
  if (p.cashedOutAt !== null && p.payout !== null) {
    status = {
      text: `↑ ${p.cashedOutAt.toFixed(2)}x · +${p.payout.toFixed(0)}`,
      color: "text-flame",
    };
  } else if (p.bet !== null && phase === "crashed") {
    status = { text: "✗ lost", color: "text-danger" };
  } else if (p.bet !== null) {
    status = { text: `§ ${p.bet}`, color: "text-ink" };
  } else {
    status = { text: "// watching", color: "text-ink/40" };
  }

  return (
    <li
      className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm tabular-nums ${
        isSelf ? "bg-flame/10" : ""
      }`}
      style={{ fontFamily: "var(--font-hand)" }}
    >
      <span className="truncate font-bold">
        {isSelf ? "▸ " : ""}
        {p.name}
      </span>
      <span className={`shrink-0 ${status.color}`}>{status.text}</span>
    </li>
  );
}
