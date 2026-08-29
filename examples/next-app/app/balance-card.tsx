"use client";

import { useWallet } from "@sorokit/wallet-adapter";
import { useAccount, useBalance } from "@sorokit/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const account = useAccount(address);
  const balance = useBalance(address, "native");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="truncate font-mono text-xs text-muted-foreground">{address}</p>
        {account.data?.exists ? (
          <Badge variant="secondary">Sequence {account.data.sequence}</Badge>
        ) : (
          <p className="text-muted-foreground">
            This account does not exist on testnet yet. Fund it with Friendbot.
          </p>
        )}
        <p>Balance: {balance.data?.formatted ?? "..."} XLM</p>
      </CardContent>
    </Card>
  );
}
