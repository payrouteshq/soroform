"use client";

import { useWallet } from "@soroform/wallet";
import { useAccount, useBalance } from "@soroform/hooks";

export function BalanceCard() {
  const { address, isConnected } = useWallet();

  if (!isConnected || !address) {
    return (
      <div className="card">
        <h2>Your account</h2>
        <p>Connect a wallet to see your balance.</p>
      </div>
    );
  }

  return <ConnectedBalance address={address} />;
}

function ConnectedBalance({ address }: { address: string }) {
  const account = useAccount(address);
  const balance = useBalance(address, "native");

  return (
    <div className="card">
      <h2>Your account</h2>
      <p style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>{address}</p>
      <p>
        {account.data?.exists
          ? `Sequence ${account.data.sequence}`
          : "This account does not exist on testnet yet. Fund it with Friendbot."}
      </p>
      <p>Balance: {balance.data?.formatted ?? "..."} XLM</p>
    </div>
  );
}
