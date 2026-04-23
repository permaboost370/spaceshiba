"use client";
import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";

import "@solana/wallet-adapter-react-ui/styles.css";

// Solana wallet context. Used for wallet connect + reading token balances +
// submitting deposit txs, so the RPC needs to actually work for
// unauthenticated browser traffic — the default `api.mainnet-beta.solana.com`
// rate-limits anonymous clients hard. publicnode matches the server's
// default and accepts browser requests. Override via NEXT_PUBLIC_SOLANA_RPC_URL
// if you wire a paid endpoint.
const DEFAULT_RPC = "https://solana-rpc.publicnode.com";

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEFAULT_RPC,
    [],
  );
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
