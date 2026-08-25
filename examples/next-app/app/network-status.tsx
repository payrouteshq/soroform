"use client";

import { useNetworkStatus } from "@soroform/hooks";

export function NetworkStatus() {
  const { data } = useNetworkStatus();

  return (
    <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
      Testnet: {data?.health.status ?? "checking..."} (ledger{" "}
      {data?.latestLedger.sequence ?? "?"})
    </p>
  );
}
