import { SoroformProvider } from "@soroform/provider";
import { WalletProvider, ConnectWalletButton } from "@soroform/wallet";
import { SoroformDevtools } from "@soroform/devtools";
import { NetworkStatus } from "./network-status";
import { ContractMetadata } from "./contract-metadata";
import { BalanceCard } from "./balance-card";
import { TransferForm } from "./transfer-form";

export function App() {
  return (
    <SoroformProvider network="testnet">
      <WalletProvider>
        <main>
          <header
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <h1 style={{ fontSize: "1.25rem", margin: 0 }}>Soroform example</h1>
              <NetworkStatus />
            </div>
            <ConnectWalletButton />
          </header>

          <ContractMetadata />
          <BalanceCard />
          <TransferForm />
        </main>
        <SoroformDevtools />
      </WalletProvider>
    </SoroformProvider>
  );
}
