"use client";

import { useContractRead } from "@soroform/contract";
import { NATIVE_SAC_CONTRACT_ID } from "./contract";

/**
 * Reads two metadata methods directly off the contract via
 * useContractRead, demonstrating the core "no code generation" pipeline:
 * the args schema and result decoding for `symbol` and `decimals` are
 * both derived automatically from the contract's spec at runtime.
 */
export function ContractMetadata() {
  const symbol = useContractRead<string>({
    contractId: NATIVE_SAC_CONTRACT_ID,
    method: "symbol",
  });
  const decimals = useContractRead<number>({
    contractId: NATIVE_SAC_CONTRACT_ID,
    method: "decimals",
  });

  return (
    <div className="card">
      <h2>Contract metadata</h2>
      <p>
        symbol: {symbol.data ?? (symbol.isLoading ? "..." : symbol.error?.message)}
      </p>
      <p>
        decimals: {decimals.data ?? (decimals.isLoading ? "..." : decimals.error?.message)}
      </p>
    </div>
  );
}
