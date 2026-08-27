"use client";

import type { ReactNode } from "react";
import { SoroformProvider } from "@soroform/provider";
import { WalletProvider } from "@soroform/wallet-adapter";
import { stellarWalletsKit } from "@soroform/wallet-adapter/adapters/stellar-wallets-kit";
import { SoroformDevtools } from "@soroform/devtools";

const adapter = stellarWalletsKit();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SoroformProvider network="testnet">
      <WalletProvider adapter={adapter}>
        {children}
        <SoroformDevtools />
      </WalletProvider>
    </SoroformProvider>
  );
}
