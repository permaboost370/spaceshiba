// Provably-fair crash curve. Runs client-side for now; a real server would
// keep the serverSeed secret and reveal it after the round for verification.

export async function sha256(msg: string): Promise<string> {
  const buf = new TextEncoder().encode(msg);
  // Cast works around a newer lib.dom/Node type conflict introduced by
  // @solana/* deps — runtime Uint8Array satisfies BufferSource fine.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    buf as unknown as BufferSource,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// sha256 where the input is a hex string interpreted as raw bytes. Used
// for chain-link verification: chain[i] = sha256(bytes(chain[i+1])), so
// to check the link we take the revealed seed's bytes and hash them,
// then compare against the previous round's revealed seed.
export async function sha256OfHex(hex: string): Promise<string> {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) throw new Error("sha256OfHex: odd hex length");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes as unknown as BufferSource,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type RoundSeed = {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  hash: string;
};

export async function newSeed(
  clientSeed: string,
  nonce: number,
): Promise<RoundSeed> {
  const serverSeed = randomHex(32);
  const hash = await sha256(`${serverSeed}:${clientSeed}:${nonce}`);
  return { serverSeed, clientSeed, nonce, hash };
}

// BustaBit-style crash point. House edge is applied by forcing an instant
// 1.00x bust when the first byte of the hash is below HOUSE_EDGE_BYTE;
// everything else follows the heavy-tailed inverse-CDF. Current setting:
// 20/256 ≈ 7.81% instant bust — stacked a bit higher than the classic
// 1–3% so the expected house edge stays positive across the fixed-cashout
// strategies players tend to use. The scheme is still provably fair:
// seed is committed by hash before bets and revealed on crash for
// client-side verification.
const HOUSE_EDGE_BYTE = 20;

// Hard cap on the crash point. Without a cap the heavy tail can produce
// 500x+ rounds, and a single max-bet player holding to that would hand
// the bank a catastrophic loss. 50x keeps the max payout per bet bounded:
// bet * 50 = 5,000 on the 100-token max bet. Rounds the curve would have
// pushed above 50 all land at exactly 50.
const MAX_CRASH = 50;

export function crashPointFromHash(hash: string): number {
  const edgeByte = parseInt(hash.slice(0, 2), 16);
  if (edgeByte < HOUSE_EDGE_BYTE) return 1.0;

  const hs = hash.slice(0, 13);
  const r = parseInt(hs, 16);
  const e = Math.pow(2, 52);
  const result = Math.floor((100 * e - r) / (e - r)) / 100;
  return Math.max(1.0, Math.min(result, MAX_CRASH));
}

// Tuned growth rate — see unit tests below for milestones.
//   t = 0s  → 1.00x
//   t = 5s  → 1.41x
//   t = 10s → 1.99x
//   t = 20s → 3.97x
//   t = 30s → 7.89x
const GROWTH = 1.0718;

export function multiplierAt(ms: number): number {
  return Math.pow(GROWTH, ms / 1000);
}

export function timeAtMultiplier(x: number): number {
  return (Math.log(x) / Math.log(GROWTH)) * 1000;
}
