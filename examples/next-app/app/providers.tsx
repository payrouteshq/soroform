"use client";

import type { ReactNode } from "react";
import { SoroformProvider } from "@soroform/provider";
import { WalletProvider } from "@soroform/wallet";
import { SoroformDevtools } from "@soroform/devtools";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SoroformProvider network="testnet">
      <WalletProvider>
        {children}
        <SoroformDevtools />
      </WalletProvider>
    </SoroformProvider>
  );
}
