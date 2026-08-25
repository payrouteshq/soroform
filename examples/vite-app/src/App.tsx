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
        <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-8">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Soroform example</h1>
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
