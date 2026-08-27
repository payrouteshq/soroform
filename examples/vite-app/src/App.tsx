import { SoroformProvider } from "@soroform/provider";
import { ConnectWalletButton } from "@soroform/wallet-adapter";
import { stellarWalletsKit } from "@soroform/wallet-adapter/stellar-wallets-kit";
import { NetworkStatus } from "./network-status";
import { ContractMetadata } from "./contract-metadata";
import { BalanceCard } from "./balance-card";
import { TransferForm } from "./transfer-form";

const wallet = stellarWalletsKit();

export function App() {
  return (
    <SoroformProvider network="testnet" wallet={wallet} devtools>
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
    </SoroformProvider>
  );
}
