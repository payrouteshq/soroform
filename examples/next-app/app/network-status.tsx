"use client";

import { useNetworkStatus } from "@sorokit/hooks";

export function NetworkStatus() {
  const { data } = useNetworkStatus();

  return (
    <p className="text-sm text-muted-foreground">
      Testnet: {data?.health.status ?? "checking..."} (ledger {data?.latestLedger.sequence ?? "?"})
    </p>
  );
}
