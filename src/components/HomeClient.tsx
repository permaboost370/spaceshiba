"use client";
import { useState } from "react";
import { useMultiplayerGame } from "@/lib/useMultiplayerGame";
import { CrashGraph } from "@/components/CrashGraph";
import { BetPanel } from "@/components/BetPanel";
import { HistoryButton } from "@/components/HistoryButton";
import { HistoryModal } from "@/components/HistoryModal";
import { MuteButton } from "@/components/MuteButton";
import { BackgroundFX } from "@/components/BackgroundFX";
import { PlayersList } from "@/components/PlayersList";
import { AstroidMark } from "@/components/AstroidMark";
import { NameTag } from "@/components/NameTag";
import { WalletButton } from "@/components/WalletButton";
import { ProfileModal } from "@/components/ProfileModal";
import { MobileMenu, HamburgerButton } from "@/components/MobileMenu";
import { ShareToast } from "@/components/ShareToast";
import { DisclaimerGate } from "@/components/DisclaimerGate";
import { ChatPanel } from "@/components/ChatPanel";

export function HomeClient() {
  const g = useMultiplayerGame();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const statusPill = (
    <div
      className={`shrink-0 flex items-center gap-1.5 px-2 py-1 border-2 border-ink bg-surface text-[10px] sm:text-xs uppercase tracking-widest ${
        g.connected ? "text-success" : "text-danger"
      }`}
      style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      title={g.connected ? "connected" : "offline"}
    >
      <span
        className={`inline-block w-2 h-2 ${g.connected ? "bg-success" : "bg-danger"} animate-pulse`}
      />
      {g.connected ? "LIVE" : "OFFLINE"}
    </div>
  );

  const openProfileFromMenu = () => {
    setMenuOpen(false);
    setProfileOpen(true);
  };

  return (
    <main
      className="relative w-full flex flex-col overflow-hidden"
      style={{ height: "100svh" }}
    >
      <BackgroundFX phase={g.phase} multiplier={g.multiplier} />

      <header className="relative z-20 flex items-center gap-2 px-3 pt-2 sm:px-4 sm:pt-3">
        <div className="shrink-0 flex items-center gap-2 px-2 py-1 border-2 border-ink bg-surface">
          <AstroidMark size={20} color="var(--color-flame)" />
          <span
            className="text-ink uppercase tracking-[0.18em] text-xs sm:text-sm leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SPACESHIBA
          </span>
          <span
            className="hidden sm:inline text-ink/45 text-[10px] tracking-[0.2em] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            // ASTROID
          </span>
        </div>
        <div className="flex-1 min-w-0 flex justify-start">
          <HistoryButton
            latest={g.history[0]?.crashPoint ?? null}
            count={g.history.length}
            onClick={() => setHistoryOpen(true)}
          />
        </div>
        {/* Mobile: one hamburger; desktop items live in the right column */}
        <div className="md:hidden">
          <HamburgerButton onClick={() => setMenuOpen(true)} />
        </div>
      </header>

      <div className="relative z-10 flex-1 min-h-0 px-2 sm:px-4 pt-2 flex gap-3 sm:gap-4">
        <section className="relative flex-1 min-w-0">
          <CrashGraph
            phase={g.phase}
            multiplier={g.multiplier}
            elapsedMs={g.elapsedMs}
            bettingMsLeft={g.phaseMsLeft}
            crashPoint={g.crashPoint}
          />
        </section>

        <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 gap-2 min-h-0">
          <div className="flex items-center gap-2 justify-end">
            {statusPill}
            <MuteButton muted={g.muted} setMuted={g.setMuted} />
          </div>
          <WalletButton onOpenProfile={() => setProfileOpen(true)} />
          <NameTag name={g.playerName} onRename={g.renamePlayer} />
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="flex-[3] min-h-0">
              <PlayersList
                players={g.players}
                phase={g.phase}
                selfId={g.playerId}
              />
            </div>
            <div className="flex-[2] min-h-0">
              <ChatPanel
                messages={g.chat}
                sendChat={g.sendChat}
                canChat={g.authStatus === "authenticated"}
                selfWallet={g.walletAddress}
              />
            </div>
          </div>
        </aside>
      </div>

      <div className="md:hidden relative z-10 px-3 sm:px-4 pt-2 h-[14vh] min-h-[88px]">
        <PlayersList players={g.players} phase={g.phase} selfId={g.playerId} />
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="flex items-center gap-2">
          {statusPill}
          <MuteButton muted={g.muted} setMuted={g.setMuted} />
        </div>
        <WalletButton onOpenProfile={openProfileFromMenu} />
        <NameTag name={g.playerName} onRename={g.renamePlayer} />
      </MobileMenu>

      <HistoryModal
        history={g.history}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        walletAddress={g.walletAddress}
        name={g.playerName}
        onRename={g.renamePlayer}
        history={g.myHistory}
        balance={g.balance}
      />

      <ShareToast lastWin={g.lastWin} onDismiss={g.dismissLastWin} />

      <section className="relative z-10 px-3 sm:px-4 pb-3 sm:pb-4 pt-2">
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
          walletAddress={g.walletAddress}
          authStatus={g.authStatus}
          authError={g.authError}
          retryAuth={g.retryAuth}
        />
      </section>

      <DisclaimerGate />
    </main>
  );
}
