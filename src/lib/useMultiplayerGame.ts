"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
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

// Personal per-round result — persisted in localStorage keyed by wallet
export type MyRoundResult = {
  nonce: number;
  crashPoint: number;
  bet: number;
  cashedOutAt: number | null;
  payout: number;
  won: boolean;
  timestamp: number;
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

const DEFAULT_BALANCE = 1000;
// Lowest balance we'll let a broke player sit at before refilling them.
// Anything below this with no active bet gets topped back up to
// DEFAULT_BALANCE on the next betting phase.
const REFILL_THRESHOLD = 1;

// localStorage key helpers — scoped to wallet address when connected,
// or to "anon" for disconnected users
const nameKey = (addr: string | null) =>
  `spaceshiba.name.${addr ?? "anon"}`;
const balanceKey = (addr: string | null) =>
  `spaceshiba.balance.${addr ?? "anon"}`;
const historyKey = (addr: string | null) =>
  `spaceshiba.myhistory.${addr ?? "anon"}`;

export type AuthStatus =
  | "idle"
  | "signing"
  | "authenticated"
  | "error";

export function useMultiplayerGame() {
  const { publicKey, signMessage } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [authError, setAuthError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("betting");
  const [multiplier, setMultiplier] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [phaseMsLeft, setPhaseMsLeft] = useState(6000);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [players, setPlayers] = useState<PlayerView[]>([]);

  const [balance, setBalance] = useState<number>(DEFAULT_BALANCE);
  const [betInput, setBetInput] = useState<number>(100);
  const [myHistory, setMyHistory] = useState<MyRoundResult[]>([]);
  const [lastWin, setLastWin] = useState<{
    multiplier: number;
    payout: number;
    bet: number;
    id: number;
  } | null>(null);

  const phaseAnchorRef = useRef<{
    phase: Phase;
    localStart: number;
    serverElapsed: number;
  }>({
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
  const walletAddressRef = useRef<string | null>(null);
  walletAddressRef.current = walletAddress;
  const signMessageRef = useRef<typeof signMessage>(signMessage);
  signMessageRef.current = signMessage;
  const authStatusRef = useRef<AuthStatus>(authStatus);
  authStatusRef.current = authStatus;

  const audio = useAudio();
  const audioRef = useRef(audio);
  audioRef.current = audio;

  // Load profile (name, balance, myHistory) when wallet address changes.
  // Anonymous / pre-connect uses the "anon" bucket.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nk = nameKey(walletAddress);
    const bk = balanceKey(walletAddress);
    const hk = historyKey(walletAddress);

    const storedName = window.localStorage.getItem(nk);
    if (storedName) {
      setPlayerName(storedName);
    } else if (walletAddress) {
      // fresh wallet: default name = shortened address
      const defaultName = `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`;
      setPlayerName(defaultName);
    } else {
      setPlayerName("");
    }

    const storedBalance = window.localStorage.getItem(bk);
    if (storedBalance !== null) {
      const n = Number(storedBalance);
      if (Number.isFinite(n) && n >= 0) setBalance(n);
      else setBalance(DEFAULT_BALANCE);
    } else {
      setBalance(DEFAULT_BALANCE);
    }

    const storedHistory = window.localStorage.getItem(hk);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as MyRoundResult[];
        if (Array.isArray(parsed)) setMyHistory(parsed);
      } catch {
        setMyHistory([]);
      }
    } else {
      setMyHistory([]);
    }
  }, [walletAddress]);

  // Persist name
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!playerName) return;
    window.localStorage.setItem(nameKey(walletAddress), playerName);
  }, [playerName, walletAddress]);

  // Persist balance
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(balanceKey(walletAddress), String(balance));
  }, [balance, walletAddress]);

  // Persist personal history
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      historyKey(walletAddress),
      JSON.stringify(myHistory.slice(0, 50)),
    );
  }, [myHistory, walletAddress]);

  // Sync name to server when name changes and we're connected
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !playerName) return;
    try {
      ws.send(JSON.stringify({ type: "setName", name: playerName }));
    } catch {
      /* ignore */
    }
  }, [playerName]);

  // Broke-player auto-refill. Chips are play money, so if the user busts
  // we top them back up to DEFAULT_BALANCE at the start of the next betting
  // phase. Gated on "no active bet" so we never refill mid-round.
  useEffect(() => {
    if (phase !== "betting") return;
    if (activeBetRef.current !== null) return;
    if (balance < REFILL_THRESHOLD) setBalance(DEFAULT_BALANCE);
  }, [phase, balance]);

  const applyServerState = useCallback((s: ServerState) => {
    const prevPhase = phaseAtAnchorRef.current;
    const myselfBefore = activeBetRef.current;
    const cashedBefore = cashedOutAtRef.current;

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

        // Record personal history if I had a bet this round
        if (
          prevPhase === "flying" &&
          myselfBefore !== null &&
          s.crashPoint !== null &&
          s.seed
        ) {
          const cashed = cashedBefore; // settled before this update
          const payout = cashed !== null ? myselfBefore * cashed : 0;
          const entry: MyRoundResult = {
            nonce: s.seed.nonce,
            crashPoint: s.crashPoint,
            bet: myselfBefore,
            cashedOutAt: cashed,
            payout,
            won: cashed !== null,
            timestamp: Date.now(),
          };
          setMyHistory((h) => [entry, ...h].slice(0, 50));
        }
      } else if (s.phase === "betting") {
        setMultiplier(1);
        lastTickSecondRef.current = -1;
      }
    }

    // I just cashed out — credit winnings + ding + surface a share toast
    if (
      myCashedOut !== null &&
      cashedBefore === null &&
      me &&
      me.bet !== null
    ) {
      const payout = me.bet * myCashedOut;
      setBalance((b) => b + payout);
      ca.cashOutDing();
      setLastWin({
        multiplier: myCashedOut,
        payout,
        bet: me.bet,
        id: Date.now(),
      });
    }
    cashedOutAtRef.current = myCashedOut;

    // Only refund when prev+current are both betting — real cancellation,
    // not the normal crashed→betting bet reset.
    if (
      prevPhase === "betting" &&
      s.phase === "betting" &&
      myselfBefore !== null &&
      myBet === null
    ) {
      setBalance((b) => b + myselfBefore);
    }
  }, []);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  // Reset auth state + force a fresh server session when the connected
  // wallet changes (including disconnect). The reconnect timer in ws.onclose
  // reopens the socket; the effect below will request_auth again.
  const prevWalletRef = useRef<string | null>(walletAddress);
  useEffect(() => {
    if (prevWalletRef.current === walletAddress) return;
    const prev = prevWalletRef.current;
    prevWalletRef.current = walletAddress;
    setAuthStatus("idle");
    setAuthError(null);
    if (prev !== null) {
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
    }
  }, [walletAddress]);

  // Kick off sign-in when wallet is connected and the socket is open.
  // Only triggers from "idle" — error/retry is user-driven via retryAuth()
  // to avoid looping the wallet's signMessage prompt after rejection.
  useEffect(() => {
    if (!walletAddress) return;
    if (!connected) return;
    if (authStatus !== "idle") return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(
        JSON.stringify({ type: "request_auth", address: walletAddress }),
      );
    } catch {
      /* ignore */
    }
  }, [walletAddress, connected, authStatus]);

  const retryAuth = useCallback(() => {
    setAuthStatus("idle");
    setAuthError(null);
  }, []);

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
        // push our current name to the server as soon as we're connected
        const name = playerName;
        if (name && ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: "setName", name }));
          } catch {
            /* ignore */
          }
        }
      };
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        audioRef.current.stopEngine();
        if (!closed) reconnectTimer = setTimeout(connect, 1500);
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
      };
      ws.onmessage = async (evt) => {
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
        } else if (msg.type === "auth_challenge") {
          if (typeof msg.message !== "string") return;
          const sign = signMessageRef.current;
          const addr = walletAddressRef.current;
          if (!sign || !addr) {
            setAuthStatus("error");
            setAuthError("wallet_cannot_sign");
            return;
          }
          try {
            setAuthStatus("signing");
            setAuthError(null);
            const sigBytes = await sign(new TextEncoder().encode(msg.message));
            const sigB58 = bs58.encode(sigBytes);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "auth",
                  address: addr,
                  signature: sigB58,
                }),
              );
            }
          } catch {
            setAuthStatus("error");
            setAuthError("user_rejected");
          }
        } else if (msg.type === "auth_ok") {
          setAuthStatus("authenticated");
          setAuthError(null);
        } else if (msg.type === "auth_error") {
          setAuthStatus("error");
          setAuthError(
            typeof msg.reason === "string" ? msg.reason : "auth_failed",
          );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const frame = () => {
      if (cancelled) return;
      const anchor = phaseAnchorRef.current;
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

  const isAuthed = authStatus === "authenticated";

  const placeBet = useCallback(() => {
    if (!isAuthed) return;
    if (phase !== "betting") return;
    if (activeBet !== null) return;
    if (!Number.isFinite(betInput) || betInput <= 0 || betInput > balance)
      return;
    if (betInput > 500) return;
    setBalance((b) => b - betInput);
    send({ type: "placeBet", amount: Math.floor(betInput) });
  }, [isAuthed, phase, activeBet, betInput, balance, send]);

  const cashOut = useCallback(() => {
    if (!isAuthed) return;
    if (phase !== "flying") return;
    if (activeBet === null || cashedOutAt !== null) return;
    send({ type: "cashOut" });
  }, [isAuthed, phase, activeBet, cashedOutAt, send]);

  const cancelBet = useCallback(() => {
    if (!isAuthed) return;
    if (phase !== "betting" || activeBet === null) return;
    send({ type: "cancelBet" });
  }, [isAuthed, phase, activeBet, send]);

  const renamePlayer = useCallback(
    (name: string) => {
      const n = name.trim().slice(0, 20);
      if (!n) return;
      setPlayerName(n);
      send({ type: "setName", name: n });
    },
    [send],
  );

  const dismissLastWin = useCallback(() => setLastWin(null), []);

  return {
    connected,
    authStatus,
    authError,
    retryAuth,
    playerId,
    playerName,
    renamePlayer,
    walletAddress,
    phase,
    multiplier,
    elapsedMs,
    phaseMsLeft,
    crashPoint,
    history,
    players,
    balance,
    betInput,
    setBetInput,
    activeBet,
    cashedOutAt,
    myHistory,
    placeBet,
    cashOut,
    cancelBet,
    muted: audio.muted,
    setMuted: audio.setMuted,
    lastWin,
    dismissLastWin,
  };
}
