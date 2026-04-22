"use client";
import { useGame } from "@/lib/useGame";
import { CrashGraph } from "@/components/CrashGraph";
import { BetPanel } from "@/components/BetPanel";
import { HistoryStrip } from "@/components/HistoryStrip";
import { MuteButton } from "@/components/MuteButton";
import { BackgroundFX } from "@/components/BackgroundFX";

export default function Home() {
  const g = useGame();

  return (
    <main
      className="relative w-full flex flex-col overflow-hidden"
      style={{ height: "100svh" }}
    >
      <BackgroundFX phase={g.phase} multiplier={g.multiplier} />

      <header className="relative z-20 flex items-center gap-2 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex-1 min-w-0">
          <HistoryStrip history={g.history} />
        </div>
        <MuteButton muted={g.muted} setMuted={g.setMuted} />
      </header>

      <section className="relative z-10 flex-1 min-h-0 px-2 sm:px-4">
        <CrashGraph
          phase={g.phase}
          multiplier={g.multiplier}
          elapsedMs={g.elapsedMs}
          bettingMsLeft={g.phaseMsLeft}
          crashPoint={g.crashPoint}
        />
      </section>

      <section className="relative z-10 px-3 sm:px-4 pb-4 sm:pb-6 pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
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
        />
      </section>
    </main>
  );
}
