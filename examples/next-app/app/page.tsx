import { ConnectWalletButton } from "@soroform/wallet";
import { NetworkStatus } from "./network-status";
import { ContractMetadata } from "./contract-metadata";
import { BalanceCard } from "./balance-card";
import { TransferForm } from "./transfer-form";

export default function Home() {
  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
  );
}
