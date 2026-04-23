// DB adapter for Spaceshiba balances + deposits + withdrawals.
// Amounts are stored and returned as bigint (token's smallest unit); any
// conversion to "UI amount" (divided by 10^decimals) happens at the edges.

import pg from "pg";
import { randomUUID } from "node:crypto";

const { Pool, types } = pg;

// pg returns NUMERIC as string by default to avoid float-precision loss.
// We want bigint here — every amount is an integer in smallest-token-unit,
// guaranteed to fit in 63 bits for our token (supply <= 2^63).
types.setTypeParser(1700, (v) => (v == null ? 0n : BigInt(v)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("[db] idle client error", err);
});

export async function getBalance(wallet: string): Promise<bigint> {
  const r = await pool.query<{ amount: bigint }>(
    `SELECT amount FROM balances WHERE wallet = $1`,
    [wallet],
  );
  return r.rows[0]?.amount ?? 0n;
}

// Debit atomically; returns new balance if successful, null if insufficient.
export async function debitBalance(
  wallet: string,
  amount: bigint,
): Promise<bigint | null> {
  if (amount <= 0n) return null;
  const r = await pool.query<{ amount: bigint }>(
    `UPDATE balances
        SET amount = amount - $2::numeric, updated_at = NOW()
      WHERE wallet = $1 AND amount >= $2::numeric
      RETURNING amount`,
    [wallet, amount.toString()],
  );
  return r.rows[0]?.amount ?? null;
}

export async function creditBalance(
  wallet: string,
  amount: bigint,
): Promise<bigint> {
  if (amount <= 0n) return await getBalance(wallet);
  const r = await pool.query<{ amount: bigint }>(
    `INSERT INTO balances (wallet, amount)
     VALUES ($1, $2::numeric)
     ON CONFLICT (wallet)
       DO UPDATE SET amount = balances.amount + EXCLUDED.amount,
                     updated_at = NOW()
     RETURNING amount`,
    [wallet, amount.toString()],
  );
  return r.rows[0]!.amount;
}

// Deposit upsert. Returns true if this deposit was newly recorded (and
// the credit applied), false if it was already known — which makes the
// watcher naturally idempotent against retries/overlapping polls.
export async function recordDepositAndCredit(
  signature: string,
  wallet: string,
  amount: bigint,
  slot: number | null,
): Promise<boolean> {
  if (amount <= 0n) return false;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO deposits (signature, wallet, amount, slot)
       VALUES ($1, $2, $3::numeric, $4)
       ON CONFLICT (signature) DO NOTHING
       RETURNING signature`,
      [signature, wallet, amount.toString(), slot],
    );
    if (ins.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `INSERT INTO balances (wallet, amount)
       VALUES ($1, $2::numeric)
       ON CONFLICT (wallet)
         DO UPDATE SET amount = balances.amount + EXCLUDED.amount,
                       updated_at = NOW()`,
      [wallet, amount.toString()],
    );
    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function getWatcherCursor(): Promise<string | null> {
  const r = await pool.query<{ last_signature: string | null }>(
    `SELECT last_signature FROM watcher_cursor WHERE id = 1`,
  );
  return r.rows[0]?.last_signature ?? null;
}

export async function setWatcherCursor(signature: string): Promise<void> {
  await pool.query(
    `UPDATE watcher_cursor SET last_signature = $1, updated_at = NOW() WHERE id = 1`,
    [signature],
  );
}

// Enqueue a withdrawal: atomically debit the player's balance and insert
// a pending row. Returns the new withdrawal id, or null on insufficient
// balance.
export async function enqueueWithdrawal(
  wallet: string,
  amount: bigint,
): Promise<string | null> {
  if (amount <= 0n) return null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deb = await client.query<{ amount: bigint }>(
      `UPDATE balances
          SET amount = amount - $2::numeric, updated_at = NOW()
        WHERE wallet = $1 AND amount >= $2::numeric
        RETURNING amount`,
      [wallet, amount.toString()],
    );
    if (deb.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const id = randomUUID();
    await client.query(
      `INSERT INTO withdrawals (id, wallet, amount, status)
       VALUES ($1, $2, $3::numeric, 'pending')`,
      [id, wallet, amount.toString()],
    );
    await client.query("COMMIT");
    return id;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// Returns true if we actually transitioned this row from 'pending' → 'sent'.
// A false return means the row has been moved to another status since we
// enqueued (e.g. the reconciler decided it was stale and refunded it) —
// the caller MUST NOT submit the signed tx in that case, or we'd double-pay.
export async function markWithdrawalSent(
  id: string,
  signature: string,
): Promise<boolean> {
  const r = await pool.query(
    `UPDATE withdrawals SET signature = $2, status = 'sent'
      WHERE id = $1 AND status = 'pending'`,
    [id, signature],
  );
  return (r.rowCount ?? 0) > 0;
}

// --- Seed chain ---

export type SeedChainRow = {
  terminal_seed: string;
  head_hash: string;
  chain_length: number;
  last_nonce: number;
};

export async function getSeedChainRow(): Promise<SeedChainRow | null> {
  const r = await pool.query<SeedChainRow>(
    `SELECT terminal_seed, head_hash, chain_length, last_nonce
       FROM seed_chain WHERE id = 1`,
  );
  return r.rows[0] ?? null;
}

export async function insertSeedChain(
  terminalSeed: string,
  headHash: string,
  chainLength: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO seed_chain (id, terminal_seed, head_hash, chain_length, last_nonce)
     VALUES (1, $1, $2, $3, 0)
     ON CONFLICT (id) DO NOTHING`,
    [terminalSeed, headHash, chainLength],
  );
}

// Atomically increment last_nonce and return the new value. The returned
// number is the nonce to use for the next round.
export async function advanceSeedChainNonce(): Promise<number> {
  const r = await pool.query<{ last_nonce: number }>(
    `UPDATE seed_chain SET last_nonce = last_nonce + 1
      WHERE id = 1
      RETURNING last_nonce`,
  );
  if (r.rows.length === 0) {
    throw new Error("seed_chain row missing — did migration run?");
  }
  return r.rows[0]!.last_nonce;
}

// Withdrawals that look stuck — pending/sent for longer than olderThanMs.
// Returned to the reconciler so they can be resolved by checking on-chain
// status or refunded if they never reached the network.
export async function getStalePendingWithdrawals(
  olderThanMs: number,
): Promise<
  Array<{
    id: string;
    wallet: string;
    amount: bigint;
    signature: string | null;
    status: string;
  }>
> {
  const r = await pool.query<{
    id: string;
    wallet: string;
    amount: bigint;
    signature: string | null;
    status: string;
  }>(
    `SELECT id, wallet, amount, signature, status
       FROM withdrawals
      WHERE status IN ('pending','sent')
        AND requested_at < NOW() - ($1 || ' milliseconds')::interval
      ORDER BY requested_at ASC
      LIMIT 100`,
    [String(olderThanMs)],
  );
  return r.rows;
}

export async function markWithdrawalConfirmed(id: string): Promise<void> {
  await pool.query(
    `UPDATE withdrawals SET status = 'confirmed', completed_at = NOW()
      WHERE id = $1 AND status IN ('pending','sent')`,
    [id],
  );
}

// Refund a failed withdrawal: credit the balance back and mark failed.
export async function refundFailedWithdrawal(
  id: string,
  reason: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const w = await client.query<{ wallet: string; amount: bigint; status: string }>(
      `SELECT wallet, amount, status FROM withdrawals WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const row = w.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return;
    }
    if (row.status === "confirmed" || row.status === "failed") {
      // Already resolved — no refund.
      await client.query("ROLLBACK");
      return;
    }
    await client.query(
      `INSERT INTO balances (wallet, amount)
       VALUES ($1, $2::numeric)
       ON CONFLICT (wallet)
         DO UPDATE SET amount = balances.amount + EXCLUDED.amount,
                       updated_at = NOW()`,
      [row.wallet, row.amount.toString()],
    );
    await client.query(
      `UPDATE withdrawals
          SET status = 'failed', failure_reason = $2, completed_at = NOW()
        WHERE id = $1`,
      [id, reason.slice(0, 500)],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
