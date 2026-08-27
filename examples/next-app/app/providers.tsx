"use client";

import type { ReactNode } from "react";
import { SoroformProvider } from "@soroform/provider";
import { stellarWalletsKit } from "@soroform/wallet-adapter/stellar-wallets-kit";

const wallet = stellarWalletsKit();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SoroformProvider network="testnet" wallet={wallet} devtools>
      {children}
    </SoroformProvider>
  );
}
