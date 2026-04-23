// Bustabit-style hash-chained server seeds.
//
// At first boot we generate a random 32-byte terminal seed T, pick a
// chain length L, and compute the chain backwards:
//   chain[L] = T
//   chain[i] = sha256(chain[i+1])    // as raw bytes
// chain[0] is the public "head hash" — we publish it forever.
//
// Each round with nonce n (1-indexed) uses chain[n] as its server seed.
// After the round crashes we reveal chain[n]. A player can then verify:
//   sha256(revealed_seed_n) == revealed_seed_{n-1}   (or head_hash for n=1)
// proving that we committed to the full sequence of seeds before any
// bets were placed. The server cannot reorder, skip, or re-generate a
// seed without breaking the chain link.
//
// We persist the terminal seed + last_nonce in the database so seeds
// survive restarts (critical — without it, a redeploy would reset the
// nonce and replay seeds).

import { createHash, randomBytes } from "node:crypto";
import {
  advanceSeedChainNonce,
  getSeedChainRow,
  insertSeedChain,
} from "./db";

// Length of the chain — about 100,000 rounds is enough for ~11 days of
// continuous play at 10s/round, which gives us plenty of buffer before
// we'd need to rotate to a new chain.
const DEFAULT_CHAIN_LENGTH = 100_000;

function sha256HexOfHex(input: string): string {
  return createHash("sha256").update(Buffer.from(input, "hex")).digest("hex");
}

// Build chain[0..L] in memory. chain[L] = terminal, chain[i] = sha256(chain[i+1]).
function computeChain(terminalHex: string, length: number): string[] {
  const chain = new Array<string>(length + 1);
  chain[length] = terminalHex;
  for (let i = length - 1; i >= 0; i--) {
    chain[i] = sha256HexOfHex(chain[i + 1]!);
  }
  return chain;
}

let chain: string[] | null = null;
let chainHead: string = "";
let chainLength: number = 0;

export async function initSeedChain(): Promise<void> {
  let row = await getSeedChainRow();
  if (!row) {
    const terminalHex = randomBytes(32).toString("hex");
    const newChain = computeChain(terminalHex, DEFAULT_CHAIN_LENGTH);
    const head = newChain[0]!;
    await insertSeedChain(terminalHex, head, DEFAULT_CHAIN_LENGTH);
    chain = newChain;
    chainHead = head;
    chainLength = DEFAULT_CHAIN_LENGTH;
    console.log(
      `[seedchain] generated fresh chain, head=${head} length=${chainLength}`,
    );
    return;
  }
  chain = computeChain(row.terminal_seed, row.chain_length);
  chainHead = row.head_hash;
  chainLength = row.chain_length;
  // Sanity: the chain we just recomputed from the stored terminal seed
  // must produce the head hash we committed to. Otherwise something has
  // tampered with the DB.
  if (chain[0] !== chainHead) {
    throw new Error(
      "seed chain head mismatch — refusing to start (terminal seed or head_hash in DB is corrupted)",
    );
  }
  console.log(
    `[seedchain] loaded chain, head=${chainHead} length=${chainLength} lastNonce=${row.last_nonce}`,
  );
}

export function getChainHead(): string {
  return chainHead;
}

export function getChainLength(): number {
  return chainLength;
}

// Advance to the next round: atomically increments last_nonce in the DB
// and returns the seed for that nonce. Throws if we've run past the end
// of the chain (signal to rotate before accepting more bets).
export async function advanceAndGetSeed(): Promise<{
  nonce: number;
  serverSeed: string;
}> {
  if (chain === null) {
    throw new Error("seed chain not initialized");
  }
  const nonce = await advanceSeedChainNonce();
  if (nonce > chainLength) {
    throw new Error(
      `seed chain exhausted at nonce ${nonce} (length ${chainLength}) — rotate before continuing`,
    );
  }
  return { nonce, serverSeed: chain[nonce]! };
}
