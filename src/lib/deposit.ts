"use client";
// Client-side deposit helper. Builds a Token-2022 transferChecked from the
// user's ATA to the bank's ATA, ready for wallet-adapter's sendTransaction.
// The server's deposit watcher (polling the bank ATA on-chain) credits the
// in-game balance a few seconds after confirmation — no extra wiring
// needed on top of what's already running.

import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { BANK_ADDRESS, TOKEN_MINT_ADDRESS } from "./chainConfig";

const TOKEN_PROGRAM = TOKEN_2022_PROGRAM_ID;
const TOKEN_MINT = new PublicKey(TOKEN_MINT_ADDRESS);
const BANK = new PublicKey(BANK_ADDRESS);

export const BANK_ATA = getAssociatedTokenAddressSync(
  TOKEN_MINT,
  BANK,
  false,
  TOKEN_PROGRAM,
);

let decimalsCache: number | null = null;
async function getDecimals(connection: Connection): Promise<number> {
  if (decimalsCache !== null) return decimalsCache;
  const info = await getMint(
    connection,
    TOKEN_MINT,
    "confirmed",
    TOKEN_PROGRAM,
  );
  decimalsCache = info.decimals;
  return decimalsCache;
}

// Convert a UI amount (2-decimal whole token) to raw base units, avoiding
// float × bigint drift. Mirrors the server's uiToRaw.
function uiToRaw(amount: number, decimals: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) return 0n;
  const hundredths = BigInt(Math.floor(amount * 100));
  return (hundredths * 10n ** BigInt(decimals)) / 100n;
}

export type DepositBuild = {
  tx: Transaction;
  ownerAta: PublicKey;
  rawAmount: bigint;
};

// Read the user's token balance for our mint (in UI units).
//   - returns 0 if the ATA legitimately doesn't exist (user has never held
//     this token)
//   - returns null if the RPC call failed, so the UI can distinguish
//     "known-empty" from "don't-know-yet" and avoid blocking the deposit
//     button on a transient RPC failure
export async function getUserTokenBalance(
  connection: Connection,
  owner: PublicKey,
): Promise<number | null> {
  const ata = getAssociatedTokenAddressSync(
    TOKEN_MINT,
    owner,
    false,
    TOKEN_PROGRAM,
  );
  try {
    const info = await getAccount(connection, ata, "confirmed", TOKEN_PROGRAM);
    const decimals = await getDecimals(connection);
    const raw = info.amount; // bigint
    const hundredths = (raw * 100n) / 10n ** BigInt(decimals);
    return Number(hundredths) / 100;
  } catch (e) {
    if (
      e instanceof TokenAccountNotFoundError ||
      e instanceof TokenInvalidAccountOwnerError
    ) {
      return 0;
    }
    console.warn("[deposit] wallet balance fetch failed", e);
    return null;
  }
}

export async function buildDepositTx(
  connection: Connection,
  owner: PublicKey,
  amountUi: number,
): Promise<DepositBuild> {
  const decimals = await getDecimals(connection);
  const rawAmount = uiToRaw(amountUi, decimals);
  if (rawAmount <= 0n) throw new Error("amount_too_small");

  const ownerAta = getAssociatedTokenAddressSync(
    TOKEN_MINT,
    owner,
    false,
    TOKEN_PROGRAM,
  );

  const tx = new Transaction();

  // Safety net: if somehow the bank ATA doesn't exist yet (first ever
  // deposit on a fresh environment), create it. User pays the rent
  // (~0.002 SOL). The server also knows how to create recipient ATAs on
  // withdraw so this is the only missing side.
  const bankInfo = await connection.getAccountInfo(BANK_ATA);
  if (!bankInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        owner,
        BANK_ATA,
        BANK,
        TOKEN_MINT,
        TOKEN_PROGRAM,
      ),
    );
  }

  tx.add(
    createTransferCheckedInstruction(
      ownerAta,
      TOKEN_MINT,
      BANK_ATA,
      owner,
      rawAmount,
      decimals,
      [],
      TOKEN_PROGRAM,
    ),
  );

  tx.feePayer = owner;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  return { tx, ownerAta, rawAmount };
}
