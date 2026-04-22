// Multiplayer crash game server.
// - owns the round loop (betting → flying → crashed → betting)
// - broadcasts state on phase changes and player events (not every tick,
//   clients interpolate the multiplier locally with RAF)
// - each player gets a generated name on connect, client holds its own balance
//   (fake money; trust is intentional for this demo)

import { WebSocketServer, WebSocket } from "ws";
import { randomUUID, webcrypto } from "node:crypto";
import {
  multiplierAt,
  newSeed,
  crashPointFromHash,
  type RoundSeed,
} from "../src/lib/crash";

// Ensure globalThis.crypto is set for crash.ts (Node 20+ has it, but some
// runtimes / older Node 18 may not)
if (!(globalThis as unknown as { crypto?: Crypto }).crypto) {
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as unknown as Crypto;
}

const PORT = Number(process.env.PORT) || 3101;
const BETTING_MS = 6000;
const CRASH_HOLD_MS = 3800;
const TICK_MS = 50;

type Phase = "betting" | "flying" | "crashed";

type Player = {
  id: string;
  name: string;
  ws: WebSocket;
  activeBet: number | null;
  cashedOutAt: number | null;
};

type RoundHistory = {
  nonce: number;
  crashPoint: number;
  hash: string;
  winners: number;
  totalWagered: number;
  totalPaidOut: number;
};

const state = {
  phase: "betting" as Phase,
  phaseStartedAt: Date.now(),
  crashPoint: null as number | null,
  seed: null as RoundSeed | null,
  nonce: 0,
  history: [] as RoundHistory[],
  players: new Map<string, Player>(),
};

function publicPlayerList() {
  return Array.from(state.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    bet: p.activeBet,
    cashedOutAt: p.cashedOutAt,
    payout:
      p.activeBet !== null && p.cashedOutAt !== null
        ? p.activeBet * p.cashedOutAt
        : null,
  }));
}

function publicState() {
  const now = Date.now();
  const elapsedMs = now - state.phaseStartedAt;
  const phaseDuration =
    state.phase === "betting"
      ? BETTING_MS
      : state.phase === "crashed"
        ? CRASH_HOLD_MS
        : 0;
  const phaseMsLeft =
    state.phase === "flying" ? 0 : Math.max(0, phaseDuration - elapsedMs);
  return {
    phase: state.phase,
    elapsedMs,
    phaseMsLeft,
    // Only reveal crashPoint + seed after the round has crashed
    crashPoint: state.phase === "crashed" ? state.crashPoint : null,
    seed:
      state.phase === "crashed"
        ? state.seed
        : state.seed
          ? { hash: state.seed.hash, nonce: state.seed.nonce, clientSeed: state.seed.clientSeed }
          : null,
    history: state.history.slice(0, 20),
    players: publicPlayerList(),
    serverTime: now,
  };
}

function broadcast(msg: unknown) {
  const json = JSON.stringify(msg);
  for (const p of state.players.values()) {
    if (p.ws.readyState === WebSocket.OPEN) {
      try {
        p.ws.send(json);
      } catch {
        /* ignore */
      }
    }
  }
}

function broadcastState() {
  broadcast({ type: "state", ...publicState() });
}

async function initNextRound() {
  state.nonce += 1;
  state.seed = await newSeed("spaceshiba", state.nonce);
  state.crashPoint = crashPointFromHash(state.seed.hash);
}

function resolveRound() {
  let winners = 0;
  let totalWagered = 0;
  let totalPaidOut = 0;
  for (const p of state.players.values()) {
    if (p.activeBet !== null) {
      totalWagered += p.activeBet;
      if (p.cashedOutAt !== null) {
        winners += 1;
        totalPaidOut += p.activeBet * p.cashedOutAt;
      }
    }
  }
  if (state.seed && state.crashPoint !== null) {
    state.history.unshift({
      nonce: state.seed.nonce,
      crashPoint: state.crashPoint,
      hash: state.seed.hash,
      winners,
      totalWagered,
      totalPaidOut,
    });
    if (state.history.length > 30) state.history.length = 30;
  }
}

async function tick() {
  const now = Date.now();
  const elapsed = now - state.phaseStartedAt;

  if (state.phase === "betting") {
    if (elapsed >= BETTING_MS && state.crashPoint !== null) {
      state.phase = "flying";
      state.phaseStartedAt = now;
      broadcastState();
    }
  } else if (state.phase === "flying") {
    if (state.crashPoint !== null) {
      const m = multiplierAt(elapsed);
      if (m >= state.crashPoint) {
        state.phase = "crashed";
        state.phaseStartedAt = now;
        resolveRound();
        broadcastState();
      }
    }
  } else if (state.phase === "crashed") {
    if (elapsed >= CRASH_HOLD_MS) {
      for (const p of state.players.values()) {
        p.activeBet = null;
        p.cashedOutAt = null;
      }
      await initNextRound();
      state.phase = "betting";
      state.phaseStartedAt = Date.now();
      broadcastState();
    }
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  const id = randomUUID();
  const name = `SHIBA-${id.slice(0, 4).toUpperCase()}`;
  const player: Player = {
    id,
    ws,
    name,
    activeBet: null,
    cashedOutAt: null,
  };
  state.players.set(id, player);

  ws.send(JSON.stringify({ type: "hello", playerId: id, name }));
  ws.send(JSON.stringify({ type: "state", ...publicState() }));
  broadcastState();

  ws.on("message", (raw) => {
    let msg: { type?: string; amount?: number; name?: string } = {};
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === "placeBet") {
      if (state.phase !== "betting") return;
      if (player.activeBet !== null) return;
      const amount = Number(msg.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return;
      player.activeBet = Math.floor(amount);
      broadcastState();
    } else if (msg.type === "cashOut") {
      if (state.phase !== "flying") return;
      if (player.activeBet === null || player.cashedOutAt !== null) return;
      const now = Date.now();
      const elapsed = now - state.phaseStartedAt;
      const m = multiplierAt(elapsed);
      // cap at actual crash point in case of race
      const cp = state.crashPoint;
      player.cashedOutAt = cp !== null ? Math.min(m, cp) : m;
      broadcastState();
    } else if (msg.type === "cancelBet") {
      if (state.phase !== "betting") return;
      if (player.activeBet === null) return;
      player.activeBet = null;
      broadcastState();
    } else if (msg.type === "setName") {
      if (typeof msg.name !== "string") return;
      const n = msg.name.trim().slice(0, 20);
      if (n) {
        player.name = n;
        broadcastState();
      }
    }
  });

  ws.on("close", () => {
    state.players.delete(id);
    broadcastState();
  });

  ws.on("error", () => {
    state.players.delete(id);
  });
});

(async () => {
  await initNextRound();
  state.phase = "betting";
  state.phaseStartedAt = Date.now();
  setInterval(() => {
    tick().catch((e) => console.error("tick error", e));
  }, TICK_MS);
  console.log(`[spaceshiba] websocket server listening on :${PORT}`);
})();
