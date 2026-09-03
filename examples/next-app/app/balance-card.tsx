"use client";

import { useWallet } from "@sorokit/wallet-adapter";
import { useBalance } from "@sorokit/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BalanceCard() {
  const { address, isConnected } = useWallet();

  if (!isConnected || !address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Connect a wallet to see your balance.
        </CardContent>
      </Card>
    );
  }

  return <ConnectedBalance address={address} />;
}

function ConnectedBalance({ address }: { address: string }) {
  const balance = useBalance(address, "native");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="truncate font-mono text-xs text-muted-foreground">{address}</p>
        <p>Balance: {balance.data?.formatted ?? "..."} XLM</p>
      </CardContent>
    </Card>
  );
}
