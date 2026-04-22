"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  multiplierAt,
  newSeed,
  crashPointFromHash,
  type RoundSeed,
} from "./crash";
import { useAudio } from "./useAudio";

export type Phase = "betting" | "flying" | "crashed";

export type RoundHistory = {
  nonce: number;
  crashPoint: number;
  hash: string;
  won: boolean;
  payout: number;
};

const BETTING_MS = 6000;
const CRASH_HOLD_MS = 3500;

export function useGame() {
  const [phase, setPhase] = useState<Phase>("betting");
  const [multiplier, setMultiplier] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [phaseMsLeft, setPhaseMsLeft] = useState(BETTING_MS);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [seed, setSeed] = useState<RoundSeed | null>(null);
  const [nonce, setNonce] = useState(1);

  const [balance, setBalance] = useState(1000);
  const [betInput, setBetInput] = useState(100);
  const [activeBet, setActiveBet] = useState<number | null>(null);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);

  const [history, setHistory] = useState<RoundHistory[]>([]);

  const audio = useAudio();
  // useAudio returns a fresh object each render. Hold it via a ref so the
  // RAF effect below doesn't cancel + recreate the loop on every setState.
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const phaseStartedAt = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : 0,
  );
  const rafRef = useRef<number | null>(null);
  const lastTickSecondRef = useRef<number>(-1);

  const phaseRef = useRef(phase);
  const crashPointRef = useRef(crashPoint);
  const activeBetRef = useRef(activeBet);
  const cashedOutAtRef = useRef(cashedOutAt);
  const seedRef = useRef(seed);
  const nonceRef = useRef(nonce);

  phaseRef.current = phase;
  crashPointRef.current = crashPoint;
  activeBetRef.current = activeBet;
  cashedOutAtRef.current = cashedOutAt;
  seedRef.current = seed;
  nonceRef.current = nonce;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await newSeed("crash-demo", 1);
      if (cancelled) return;
      setSeed(s);
      setCrashPoint(crashPointFromHash(s.hash));
      phaseStartedAt.current = performance.now();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - phaseStartedAt.current;
      const ph = phaseRef.current;

      if (ph === "betting") {
        const left = Math.max(0, BETTING_MS - elapsed);
        setPhaseMsLeft(left);
        // Beep on each of the last 3 seconds of the betting countdown.
        const secLeft = Math.ceil(left / 1000);
        if (secLeft <= 3 && secLeft >= 1 && secLeft !== lastTickSecondRef.current) {
          lastTickSecondRef.current = secLeft;
          // urgency: 3s→1, 2s→2, 1s→3 (higher pitch as it approaches launch)
          audioRef.current.tick(4 - secLeft);
        }
        if (left === 0 && crashPointRef.current !== null) {
          phaseStartedAt.current = now;
          setPhase("flying");
          setMultiplier(1);
          setElapsedMs(0);
          lastTickSecondRef.current = -1;
          audioRef.current.launch();
          audioRef.current.startEngine();
        }
      } else if (ph === "flying") {
        const m = multiplierAt(elapsed);
        const cp = crashPointRef.current;
        if (cp !== null && m >= cp) {
          setMultiplier(cp);
          setElapsedMs(elapsed);
          setPhase("crashed");
          phaseStartedAt.current = now;
          audioRef.current.stopEngine();
          audioRef.current.crashBoom();

          const cashed = cashedOutAtRef.current;
          const bet = activeBetRef.current;
          const won = cashed !== null;
          const payout = won && bet !== null ? bet * (cashed as number) : 0;
          const s = seedRef.current;
          if (s) {
            setHistory((h) =>
              [
                {
                  nonce: s.nonce,
                  crashPoint: cp,
                  hash: s.hash,
                  won,
                  payout,
                },
                ...h,
              ].slice(0, 16),
            );
          }
        } else {
          setMultiplier(m);
          setElapsedMs(elapsed);
          audioRef.current.updateEngine(m);
        }
      } else if (ph === "crashed") {
        const left = Math.max(0, CRASH_HOLD_MS - elapsed);
        setPhaseMsLeft(left);
        if (left === 0) {
          const nextNonce = nonceRef.current + 1;
          setNonce(nextNonce);
          setCrashPoint(null);
          newSeed("crash-demo", nextNonce).then((s) => {
            if (cancelled) return;
            setSeed(s);
            setCrashPoint(crashPointFromHash(s.hash));
          });
          setMultiplier(1);
          setElapsedMs(0);
          setActiveBet(null);
          setCashedOutAt(null);
          phaseStartedAt.current = performance.now();
          setPhase("betting");
          setPhaseMsLeft(BETTING_MS);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const placeBet = useCallback(() => {
    if (phase !== "betting") return;
    if (activeBet !== null) return;
    if (betInput <= 0 || betInput > balance) return;
    setBalance((b) => b - betInput);
    setActiveBet(betInput);
  }, [phase, activeBet, betInput, balance]);

  const cashOut = useCallback(() => {
    if (phase !== "flying") return;
    if (activeBet === null || cashedOutAt !== null) return;
    setCashedOutAt(multiplier);
    setBalance((b) => b + activeBet * multiplier);
    audioRef.current.cashOutDing();
  }, [phase, activeBet, cashedOutAt, multiplier]);

  const cancelBet = useCallback(() => {
    if (phase !== "betting" || activeBet === null) return;
    setBalance((b) => b + activeBet);
    setActiveBet(null);
  }, [phase, activeBet]);

  return {
    phase,
    multiplier,
    elapsedMs,
    phaseMsLeft,
    crashPoint,
    seed,
    balance,
    betInput,
    setBetInput,
    activeBet,
    cashedOutAt,
    history,
    placeBet,
    cashOut,
    cancelBet,
    muted: audio.muted,
    setMuted: audio.setMuted,
  };
}
