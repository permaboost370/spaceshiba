"use client";
import { useMultiplayerGame } from "@/lib/useMultiplayerGame";
import { CrashGraph } from "@/components/CrashGraph";
import { BetPanel } from "@/components/BetPanel";
import { HistoryStrip } from "@/components/HistoryStrip";
import { MuteButton } from "@/components/MuteButton";
import { BackgroundFX } from "@/components/BackgroundFX";
import { PlayersList } from "@/components/PlayersList";

export default function Home() {
  const g = useMultiplayerGame();

  return (
    <main
      className="relative w-full flex flex-col overflow-hidden"
      style={{ height: "100svh" }}
    >
      <BackgroundFX phase={g.phase} multiplier={g.multiplier} />

      <header className="relative z-20 flex items-center gap-2 px-3 pt-3 sm:px-4 sm:pt-4">
        <div
          className="shrink-0 px-2 py-1 border-2 border-ink bg-surface uppercase tracking-widest text-xs sm:text-sm"
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
        >
          SPACESHIBA · ASTROID
        </div>
        <div className="flex-1 min-w-0">
          <HistoryStrip history={g.history} />
        </div>
        <div
          className={`shrink-0 hidden sm:flex items-center gap-1.5 px-2 py-1 border-2 border-ink bg-surface text-xs uppercase tracking-widest ${
            g.connected ? "text-ink" : "text-danger"
          }`}
          style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
          title={g.connected ? "connected" : "offline"}
        >
          <span
            className={`inline-block w-2 h-2 ${g.connected ? "bg-flame" : "bg-danger"} animate-pulse`}
            style={{ borderRadius: 0 }}
          />
          {g.connected ? "live" : "offline"}
        </div>
        <MuteButton muted={g.muted} setMuted={g.setMuted} />
      </header>

      <div className="relative z-10 flex-1 min-h-0 px-2 sm:px-4 pt-2 flex gap-3 sm:gap-4">
        {/* Graph — takes most of the space */}
        <section className="relative flex-1 min-w-0">
          <CrashGraph
            phase={g.phase}
            multiplier={g.multiplier}
            elapsedMs={g.elapsedMs}
            bettingMsLeft={g.phaseMsLeft}
            crashPoint={g.crashPoint}
          />
        </section>

        {/* Players side panel — hidden on narrow mobile */}
        <aside className="hidden md:flex w-56 lg:w-64 shrink-0">
          <PlayersList
            players={g.players}
            phase={g.phase}
            selfId={g.playerId}
          />
        </aside>
      </div>

      {/* Mobile-only: players drawer above bet panel */}
      <div className="md:hidden relative z-10 px-3 sm:px-4 pt-2 max-h-[22vh]">
        <PlayersList players={g.players} phase={g.phase} selfId={g.playerId} />
      </div>

      <section className="relative z-10 px-3 sm:px-4 pb-4 sm:pb-6 pt-3">
        <BetPanel
          phase={g.phase}
          balance={g.balance}
          betInput={g.betInput}
          setBetInput={g.setBetInput}
          activeBet={g.activeBet}
          cashedOutAt={g.cashedOutAt}
          multiplier={g.multiplier}
          phaseMsLeft={g.phaseMsLeft}
          placeBet={g.placeBet}
          cashOut={g.cashOut}
          cancelBet={g.cancelBet}
          connected={g.connected}
        />
      </section>
    </main>
  );
}
