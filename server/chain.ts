// Solana chain adapter — deposit watcher + withdrawal executor.
// Separated from index.ts to keep the game loop readable.

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

// This mint uses the Token-2022 program (metadataPointer + tokenMetadata
// extensions) — so every SPL-token call has to be told that. Wrapping it
// here so we don't drift.
const TOKEN_PROGRAM = TOKEN_2022_PROGRAM_ID;
import bs58 from "bs58";
import {
  getBalance,
  getStalePendingWithdrawals,
  getWatcherCursor,
  markWithdrawalConfirmed,
  markWithdrawalSent,
  recordDepositAndCredit,
  refundFailedWithdrawal,
  setWatcherCursor,
} from "./db";

// --- Config ---
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://solana-rpc.publicnode.com";
const TOKEN_MINT_STR = process.env.TOKEN_MINT ?? "";
const BANK_ADDRESS_STR = process.env.BANK_ADDRESS ?? "";
const BANK_SECRET_KEY_STR = process.env.BANK_SECRET_KEY ?? "";

if (!TOKEN_MINT_STR) throw new Error("TOKEN_MINT env var not set");
if (!BANK_ADDRESS_STR) throw new Error("BANK_ADDRESS env var not set");

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const TOKEN_MINT = new PublicKey(TOKEN_MINT_STR);
const BANK = new PublicKey(BANK_ADDRESS_STR);

// Bank's associated token account for the configured mint. Deposits land
// here; withdrawals are sourced from here. The Token-2022 program ID has
// to be passed or we'd derive the classic-program ATA — wrong address.
const BANK_ATA = getAssociatedTokenAddressSync(
  TOKEN_MINT,
  BANK,
  false,
  TOKEN_PROGRAM,
);
const BANK_ATA_STR = BANK_ATA.toBase58();

// Signer keypair — loaded on demand so the server can still run for
// spectator-only flows if the secret isn't wired. Withdrawal attempts
// without it will error loudly.
function getBankKeypair(): Keypair {
  if (!BANK_SECRET_KEY_STR) {
    throw new Error("BANK_SECRET_KEY env var not set — cannot sign");
  }
  // Accept either the Solana CLI JSON-array form or a raw base58 string.
  if (BANK_SECRET_KEY_STR.trim().startsWith("[")) {
    const arr = JSON.parse(BANK_SECRET_KEY_STR) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }
  return Keypair.fromSecretKey(bs58.decode(BANK_SECRET_KEY_STR));
}

let decimals = 9;
let rawPerUnit = 10n ** BigInt(decimals);

export async function initChainConfig(): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      const info = await getMint(
        connection,
        TOKEN_MINT,
        "confirmed",
        TOKEN_PROGRAM,
      );
      decimals = info.decimals;
      rawPerUnit = 10n ** BigInt(decimals);
      console.log(
        `[chain] mint ${TOKEN_MINT_STR} decimals=${decimals} bankAta=${BANK_ATA_STR}`,
      );
      return;
    } catch (e) {
      const wait = Math.min(30_000, 1000 * attempt);
      console.error(
        `[chain] getMint failed (attempt ${attempt}) retrying in ${wait}ms`,
        e instanceof Error ? e.message : e,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

export function getDecimals(): number {
  return decimals;
}

export function uiToRaw(amount: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) return 0n;
  const hundredths = BigInt(Math.floor(amount * 100));
  return (hundredths * rawPerUnit) / 100n;
}

export function rawToUi(raw: bigint): number {
  const hundredths = (raw * 100n) / rawPerUnit;
  return Number(hundredths) / 100;
}

// --- Deposit watcher ---

type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string; decimals: number };
};

// Extract (sender wallet, amount) for a deposit to BANK_ATA, by diffing
// postTokenBalances against preTokenBalances. Returns null if the tx
// wasn't a transfer of our mint to us, OR if attribution is ambiguous
// (multiple non-bank owners lost balance on our mint in the same tx).
//
// Attribution rule: exactly one non-bank owner of our mint must have a
// positive loss (summed across all of their token accounts in the tx). We
// refuse to guess when multiple owners moved our token in the same tx —
// better to leave a rare ambiguous deposit stuck for manual review than
// to mis-credit it.
function extractDeposit(
  pre: TokenBalance[] | null | undefined,
  post: TokenBalance[] | null | undefined,
): { sender: string; amount: bigint } | null {
  if (!post) return null;
  const bankPost = post.find(
    (b) => b.mint === TOKEN_MINT_STR && b.owner === BANK_ADDRESS_STR,
  );
  if (!bankPost) return null;
  const bankPre = (pre ?? []).find(
    (b) =>
      b.mint === TOKEN_MINT_STR &&
      b.owner === BANK_ADDRESS_STR &&
      b.accountIndex === bankPost.accountIndex,
  );
  const bankDelta =
    BigInt(bankPost.uiTokenAmount.amount) -
    BigInt(bankPre?.uiTokenAmount.amount ?? "0");
  if (bankDelta <= 0n) return null;

  // Aggregate loss by owner for every non-bank token account of our mint.
  // Walk preTokenBalances for "started with X" and postTokenBalances for
  // accounts that didn't exist pre (so after = 0 in the map).
  const lossByOwner = new Map<string, bigint>();
  for (const prev of pre ?? []) {
    if (prev.mint !== TOKEN_MINT_STR) continue;
    if (!prev.owner || prev.owner === BANK_ADDRESS_STR) continue;
    const match = post.find(
      (b) => b.accountIndex === prev.accountIndex && b.mint === TOKEN_MINT_STR,
    );
    const after = match ? BigInt(match.uiTokenAmount.amount) : 0n;
    const before = BigInt(prev.uiTokenAmount.amount);
    const diff = before - after;
    if (diff <= 0n) continue;
    lossByOwner.set(prev.owner, (lossByOwner.get(prev.owner) ?? 0n) + diff);
  }

  // Any owners at all?
  const losers = Array.from(lossByOwner.entries()).filter(
    ([, loss]) => loss > 0n,
  );
  if (losers.length === 0) return null;
  // Ambiguous — more than one distinct non-bank owner moved our token in
  // this tx. Refuse to attribute; a human can reconcile via the signature.
  if (losers.length > 1) {
    console.warn(
      `[deposit] ambiguous attribution: ${losers.length} owners lost balance on our mint; skipping`,
    );
    return null;
  }
  const [owner, ownerLoss] = losers[0]!;
  // Sender must have lost at least as much as the bank gained — otherwise
  // the bank-side delta came from somewhere we can't account for.
  if (ownerLoss < bankDelta) return null;
  return { sender: owner, amount: bankDelta };
}

type DepositNotify = (wallet: string, newBalanceRaw: bigint) => void;

// Thrown when the RPC hasn't propagated a signature yet. The watcher loop
// catches this and retries on the next tick without advancing its cursor,
// so the deposit isn't silently dropped.
class TxNotReadyError extends Error {
  constructor(public readonly sig: string) {
    super(`tx not ready: ${sig}`);
  }
}

export async function processSignature(
  sig: string,
  slot: number | null,
  notify: DepositNotify,
): Promise<boolean> {
  const tx = await connection.getParsedTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx || !tx.meta) {
    // Not found yet — RPC propagation lag. Raise so the watcher retries.
    throw new TxNotReadyError(sig);
  }
  if (tx.meta.err) return false;

  const extracted = extractDeposit(
    tx.meta.preTokenBalances as TokenBalance[] | null,
    tx.meta.postTokenBalances as TokenBalance[] | null,
  );
  if (!extracted) {
    console.log(`[deposit] no extractable transfer in sig=${sig}`);
    return false;
  }

  const credited = await recordDepositAndCredit(
    sig,
    extracted.sender,
    extracted.amount,
    slot,
  );
  if (credited) {
    console.log(
      `[deposit] +${extracted.amount} raw from ${extracted.sender} sig=${sig}`,
    );
    const balance = await getBalance(extracted.sender);
    notify(extracted.sender, balance);
  } else {
    console.log(`[deposit] already credited sig=${sig}`);
  }
  return credited;
}

export { TxNotReadyError };

export async function startDepositWatcher(
  notify: DepositNotify,
): Promise<void> {
  // Bootstrap the cursor: on first boot we don't want to re-credit any
  // historical deposits the bank has ever received. Pin the cursor at the
  // current HEAD and only process new signatures after that point.
  let cursor = await getWatcherCursor();
  if (cursor === null) {
    try {
      const head = await connection.getSignaturesForAddress(BANK_ATA, {
        limit: 1,
      });
      if (head.length > 0) {
        cursor = head[0]!.signature;
        await setWatcherCursor(cursor);
        console.log(`[deposit] bootstrap cursor=${cursor}`);
      }
    } catch (e) {
      console.error("[deposit] bootstrap failed", e);
    }
  }

  const POLL_MS = 5000;
  const tick = async () => {
    try {
      const options: { limit: number; until?: string } = { limit: 1000 };
      if (cursor) options.until = cursor;
      const sigs = await connection.getSignaturesForAddress(
        BANK_ATA,
        options,
      );
      // API returns newest-first. Process oldest-first so we only advance
      // the cursor past a sig once its deposit has been recorded.
      sigs.reverse();
      for (const info of sigs) {
        if (info.err !== null) {
          cursor = info.signature;
          await setWatcherCursor(cursor);
          continue;
        }
        try {
          await processSignature(info.signature, info.slot, notify);
          cursor = info.signature;
          await setWatcherCursor(cursor);
        } catch (e) {
          if (e instanceof TxNotReadyError) {
            // RPC hasn't caught up yet — leave cursor where it is, retry
            // next tick. Crucial: do NOT advance past an unread sig, or a
            // real deposit will be silently skipped forever.
            console.log(`[deposit] tx not yet visible, will retry ${e.sig}`);
          } else {
            console.error(
              `[deposit] processSignature ${info.signature} failed`,
              e,
            );
          }
          break;
        }
      }
    } catch (e) {
      console.error("[deposit] poll error", e);
    } finally {
      setTimeout(tick, POLL_MS);
    }
  };
  setTimeout(tick, POLL_MS);
  console.log(`[deposit] watcher started polling ${BANK_ATA_STR}`);
}

// --- Withdrawal executor ---

export type WithdrawalResult =
  | { ok: true; signature: string }
  | { ok: false; reason: string };

export async function executeWithdrawal(
  withdrawalId: string,
  recipient: string,
  amountRaw: bigint,
): Promise<WithdrawalResult> {
  let recipientPk: PublicKey;
  try {
    recipientPk = new PublicKey(recipient);
  } catch {
    await refundFailedWithdrawal(withdrawalId, "bad_recipient");
    return { ok: false, reason: "bad_recipient" };
  }

  let bank: Keypair;
  try {
    bank = getBankKeypair();
  } catch (e) {
    await refundFailedWithdrawal(withdrawalId, "no_signer");
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "no_signer",
    };
  }

  const recipientAta = getAssociatedTokenAddressSync(
    TOKEN_MINT,
    recipientPk,
    false,
    TOKEN_PROGRAM,
  );

  try {
    const tx = new Transaction();

    // Create the recipient's ATA if it doesn't exist yet — bank pays rent.
    // It's cheap (~0.002 SOL) and saves users from having to pre-create.
    const ataInfo = await connection.getAccountInfo(recipientAta);
    if (!ataInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          bank.publicKey, // payer
          recipientAta,
          recipientPk,
          TOKEN_MINT,
          TOKEN_PROGRAM,
        ),
      );
    }

    tx.add(
      createTransferCheckedInstruction(
        BANK_ATA,
        TOKEN_MINT,
        recipientAta,
        bank.publicKey,
        amountRaw,
        decimals,
        [],
        TOKEN_PROGRAM,
      ),
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = bank.publicKey;
    tx.sign(bank);

    // Signature is deterministic once signed — extract it BEFORE sending
    // so the DB has a signature recorded even if the process crashes
    // between the send and the confirm. The reconciler uses this to tell
    // apart "never submitted" (no signature) from "submitted, outcome
    // unknown" (signature present) on restart.
    const sigBytes = tx.signatures[0]?.signature;
    if (!sigBytes) {
      await refundFailedWithdrawal(withdrawalId, "sign_failed");
      return { ok: false, reason: "sign_failed" };
    }
    const signature = bs58.encode(sigBytes);
    await markWithdrawalSent(withdrawalId, signature);

    const rawTx = tx.serialize();
    await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      maxRetries: 5,
    });

    const conf = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    if (conf.value.err) {
      await refundFailedWithdrawal(
        withdrawalId,
        `chain_error:${JSON.stringify(conf.value.err).slice(0, 200)}`,
      );
      return { ok: false, reason: "chain_error" };
    }

    await markWithdrawalConfirmed(withdrawalId);
    console.log(
      `[withdraw] ${amountRaw} raw to ${recipient} sig=${signature}`,
    );
    return { ok: true, signature };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[withdraw] failed", reason);
    await refundFailedWithdrawal(withdrawalId, reason.slice(0, 200));
    return { ok: false, reason: "submit_failed" };
  }
}

// --- Reconciliation worker ---

// How long we wait before touching a pending/sent withdrawal. Solana
// blockhashes live ~90s; after that a tx is permanently unable to land.
// We wait considerably longer than that so any RPC replication lag has
// fully settled before we act on a "not found" signature status.
const RECONCILE_MIN_AGE_MS = 5 * 60 * 1000;
const RECONCILE_POLL_MS = 60 * 1000;

async function reconcileOne(w: {
  id: string;
  wallet: string;
  signature: string | null;
  status: string;
}): Promise<void> {
  // 'pending' with no signature means executeWithdrawal never got past
  // signing (e.g. process crashed before we could submit). Nothing was
  // sent to the network, so refunding is safe.
  if (!w.signature) {
    console.log(`[reconcile] refunding ${w.id} (never submitted)`);
    await refundFailedWithdrawal(w.id, "not_submitted");
    return;
  }

  let status;
  try {
    status = await connection.getSignatureStatus(w.signature, {
      searchTransactionHistory: true,
    });
  } catch (e) {
    console.error(`[reconcile] getSignatureStatus failed ${w.id}`, e);
    return;
  }
  const val = status.value;

  if (val && val.err) {
    console.log(`[reconcile] refunding ${w.id} (chain error)`);
    await refundFailedWithdrawal(w.id, "chain_error_reconciled");
    return;
  }

  const confirmed =
    val?.confirmationStatus === "confirmed" ||
    val?.confirmationStatus === "finalized";
  if (confirmed) {
    console.log(`[reconcile] marking confirmed ${w.id}`);
    await markWithdrawalConfirmed(w.id);
    return;
  }

  if (!val) {
    // Not found after 5+ minutes. Blockhash has long since expired; the
    // tx cannot land now. Refund is safe.
    console.log(`[reconcile] refunding ${w.id} (not found, expired)`);
    await refundFailedWithdrawal(w.id, "not_found_expired");
    return;
  }

  // val exists with no err and not yet confirmed — leave alone, try again
  // next pass.
}

async function reconcileOnce(): Promise<void> {
  let list;
  try {
    list = await getStalePendingWithdrawals(RECONCILE_MIN_AGE_MS);
  } catch (e) {
    console.error("[reconcile] query failed", e);
    return;
  }
  if (list.length === 0) return;
  console.log(`[reconcile] ${list.length} stale withdrawals to resolve`);
  for (const w of list) {
    try {
      await reconcileOne(w);
    } catch (e) {
      console.error(`[reconcile] one failed ${w.id}`, e);
    }
  }
}

export function startWithdrawalReconciler(): void {
  // Kick once at startup — if the previous process crashed mid-withdrawal,
  // we want to resolve the stragglers before accepting new ones.
  reconcileOnce().catch((e) => console.error("[reconcile] initial run", e));
  setInterval(() => {
    reconcileOnce().catch((e) => console.error("[reconcile] tick", e));
  }, RECONCILE_POLL_MS);
  console.log(
    `[reconcile] worker started (min age ${RECONCILE_MIN_AGE_MS}ms, poll ${RECONCILE_POLL_MS}ms)`,
  );
}

// Prevent unused-import warnings in strict mode for imports that are only
// used by type narrowing in future helpers.
export type { ParsedInstruction, PartiallyDecodedInstruction, SystemProgram };
