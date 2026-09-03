"use client";

import type { ReactNode } from "react";
import { SorokitProvider } from "@sorokit/provider";
import { stellarWalletsKit } from "@sorokit/wallet-adapter/stellar-wallets-kit";

const wallet = stellarWalletsKit();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SorokitProvider network="TESTNET" wallet={wallet} devtools>
      {children}
    </SorokitProvider>
  );
}
