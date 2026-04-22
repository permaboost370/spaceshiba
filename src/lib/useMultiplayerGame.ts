"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { multiplierAt } from "./crash";
import { useAudio } from "./useAudio";

export type Phase = "betting" | "flying" | "crashed";

export type PlayerView = {
  id: string;
  name: string;
  bet: number | null;
  cashedOutAt: number | null;
  payout: number | null;
};

export type RoundHistory = {
  nonce: number;
  crashPoint: number;
  hash: string;
  winners: number;
  totalWagered: number;
  totalPaidOut: number;
};

type ServerState = {
  type: "state";
  phase: Phase;
  elapsedMs: number;
  phaseMsLeft: number;
  crashPoint: number | null;
  seed: {
    hash: string;
    nonce: number;
    clientSeed: string;
    serverSeed?: string;
  } | null;
  history: RoundHistory[];
  players: PlayerView[];
  serverTime: number;
};

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:3101`
    : "ws://localhost:3101");

const BALANCE_KEY = "spaceshiba.balance.v1";
const NAME_KEY = "spaceshiba.name.v1";
const DEFAULT_BALANCE = 1000;

export function useMultiplayerGame() {
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("");

  const [phase, setPhase] = useState<Phase>("betting");
  const [multiplier, setMultiplier] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [phaseMsLeft, setPhaseMsLeft] = useState(6000);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [players, setPlayers] = useState<PlayerView[]>([]);

  const [balance, setBalance] = useState<number>(DEFAULT_BALANCE);
  const [betInput, setBetInput] = useState<number>(100);

  // Local clock anchor for interpolating multiplier between server updates
  const phaseAnchorRef = useRef<{ phase: Phase; localStart: number; serverElapsed: number }>({
    phase: "betting",
    localStart: typeof performance !== "undefined" ? performance.now() : 0,
    serverElapsed: 0,
  });
  const phaseAtAnchorRef = useRef<Phase>("betting");
  const cashedOutAtRef = useRef<number | null>(null);
  const activeBetRef = useRef<number | null>(null);
  const lastTickSecondRef = useRef<number>(-1);
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string | null>(null);

  const audio = useAudio();
  const audioRef = useRef(audio);
  audioRef.current = audio;

  // Load persisted balance + name on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const b = window.localStorage.getItem(BALANCE_KEY);
    if (b !== null) {
      const n = Number(b);
      if (Number.isFinite(n) && n >= 0) setBalance(n);
    }
    const n = window.localStorage.getItem(NAME_KEY);
    if (n) setPlayerName(n);
  }, []);

  // Persist balance
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BALANCE_KEY, String(balance));
  }, [balance]);

  // Persist name
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (playerName) window.localStorage.setItem(NAME_KEY, playerName);
  }, [playerName]);

  const applyServerState = useCallback(
    (s: ServerState) => {
      const prevPhase = phaseAtAnchorRef.current;
      const myselfBefore = activeBetRef.current;
      const cashedBefore = cashedOutAtRef.current;

      // Rebase local clock so interpolation continues from what server says now
      phaseAnchorRef.current = {
        phase: s.phase,
        localStart: performance.now() - s.elapsedMs,
        serverElapsed: s.elapsedMs,
      };
      phaseAtAnchorRef.current = s.phase;

      setPhase(s.phase);
      setElapsedMs(s.elapsedMs);
      setPhaseMsLeft(s.phaseMsLeft);
      setCrashPoint(s.crashPoint);
      setHistory(s.history);
      setPlayers(s.players);

      const pid = playerIdRef.current;
      const me = pid ? s.players.find((p) => p.id === pid) : null;
      const myBet = me?.bet ?? null;
      const myCashedOut = me?.cashedOutAt ?? null;
      activeBetRef.current = myBet;

      const ca = audioRef.current;

      if (s.phase !== prevPhase) {
        if (s.phase === "flying") {
          lastTickSecondRef.current = -1;
          ca.launch();
          ca.startEngine();
          setMultiplier(1);
        } else if (s.phase === "crashed") {
          ca.stopEngine();
          ca.crashBoom();
          if (s.crashPoint !== null) setMultiplier(s.crashPoint);
        } else if (s.phase === "betting") {
          setMultiplier(1);
          lastTickSecondRef.current = -1;
        }
      }

      // Detect my cashout (null → value)
      if (myCashedOut !== null && cashedBefore === null && me && me.bet !== null) {
        setBalance((b) => b + me.bet! * myCashedOut);
        ca.cashOutDing();
      }
      cashedOutAtRef.current = myCashedOut;

      // If the server drops my bet WHILE we're still in the betting phase
      // (I cancelled, or server rejected), refund the debited amount.
      // Important: only refund when prev and current are both "betting";
      // on the crashed→betting transition the server naturally clears all
      // bets for the new round, and those were already lost — refunding
      // there was the bug that made losses invisible.
      if (
        prevPhase === "betting" &&
        s.phase === "betting" &&
        myselfBefore !== null &&
        myBet === null
      ) {
        setBalance((b) => b + myselfBefore);
      }
    },
    [],
  );

  // Keep playerIdRef in sync so the interpolation loop & message handlers see it
  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  // WebSocket connection
  useEffect(() => {
    if (typeof window === "undefined") return;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
      };
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        audioRef.current.stopEngine();
        if (!closed) {
          reconnectTimer = setTimeout(connect, 1500);
        }
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
      };
      ws.onmessage = (evt) => {
        let msg: Record<string, unknown> = {};
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }
        if (msg.type === "hello") {
          if (typeof msg.playerId === "string") {
            setPlayerId(msg.playerId);
            playerIdRef.current = msg.playerId;
          }
          if (typeof msg.name === "string" && !playerName) {
            setPlayerName(msg.name);
          }
        } else if (msg.type === "state") {
          applyServerState(msg as unknown as ServerState);
        }
      };
    };
    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
    // applyServerState is stable (no deps) — intentionally not in deps so we
    // don't reconnect every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // RAF loop for smooth multiplier + countdown interpolation
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const frame = () => {
      if (cancelled) return;
      const anchor = phaseAnchorRef.current;
      const localElapsed =
        anchor.serverElapsed + (performance.now() - anchor.localStart - anchor.serverElapsed);
      // simpler: now - localStart approximates elapsed since phase began
      const elapsed = performance.now() - anchor.localStart;
      if (anchor.phase === "flying") {
        const m = multiplierAt(elapsed);
        setMultiplier(m);
        setElapsedMs(elapsed);
        audioRef.current.updateEngine(m);
      } else if (anchor.phase === "betting") {
        const BETTING_MS = 6000;
        const left = Math.max(0, BETTING_MS - elapsed);
        setPhaseMsLeft(left);
        const secLeft = Math.ceil(left / 1000);
        if (
          secLeft <= 3 &&
          secLeft >= 1 &&
          secLeft !== lastTickSecondRef.current
        ) {
          lastTickSecondRef.current = secLeft;
          audioRef.current.tick(4 - secLeft);
        }
      } else if (anchor.phase === "crashed") {
        const CRASH_HOLD_MS = 3800;
        const left = Math.max(0, CRASH_HOLD_MS - elapsed);
        setPhaseMsLeft(left);
      }
      // suppress unused-var warning on localElapsed (kept for future tuning)
      void localElapsed;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  const send = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* ignore */
    }
  }, []);

  const me = playerId ? players.find((p) => p.id === playerId) : null;
  const activeBet = me?.bet ?? null;
  const cashedOutAt = me?.cashedOutAt ?? null;

  const placeBet = useCallback(() => {
    if (phase !== "betting") return;
    if (activeBet !== null) return;
    if (!Number.isFinite(betInput) || betInput <= 0 || betInput > balance) return;
    setBalance((b) => b - betInput);
    send({ type: "placeBet", amount: Math.floor(betInput) });
  }, [phase, activeBet, betInput, balance, send]);

  const cashOut = useCallback(() => {
    if (phase !== "flying") return;
    if (activeBet === null || cashedOutAt !== null) return;
    send({ type: "cashOut" });
  }, [phase, activeBet, cashedOutAt, send]);

  const cancelBet = useCallback(() => {
    if (phase !== "betting" || activeBet === null) return;
    // optimistic refund — applyServerState will reconcile if server had other ideas
    send({ type: "cancelBet" });
  }, [phase, activeBet, send]);

  const renamePlayer = useCallback(
    (name: string) => {
      const n = name.trim().slice(0, 20);
      if (!n) return;
      setPlayerName(n);
      send({ type: "setName", name: n });
    },
    [send],
  );

  return {
    // connection
    connected,
    playerId,
    playerName,
    renamePlayer,
    // round state
    phase,
    multiplier,
    elapsedMs,
    phaseMsLeft,
    crashPoint,
    history,
    players,
    // player state
    balance,
    betInput,
    setBetInput,
    activeBet,
    cashedOutAt,
    // actions
    placeBet,
    cashOut,
    cancelBet,
    // audio
    muted: audio.muted,
    setMuted: audio.setMuted,
  };
}
