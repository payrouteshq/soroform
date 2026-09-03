function toSerializableKeyPart(value: unknown): unknown {
  if (typeof value === "bigint") return `bigint:${value.toString()}`;

  if (value instanceof Uint8Array) {
    const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `bytes:${hex}`;
  }

  if (value instanceof Map) {
    return {
      __map__: Array.from(value.entries()).map(([key, val]) => [
        toSerializableKeyPart(key),
        toSerializableKeyPart(val),
      ]),
    };
  }

  if (Array.isArray(value)) return value.map(toSerializableKeyPart);

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = toSerializableKeyPart(val);
    }
    return result;
  }

  return value;
}

export const queryKeys = {
  /**
   * An address's balance of a given asset (native, classic, or contract)
   */
  balance: (address: string, assetId: string) => ["sorokit", "balance", address, assetId] as const,

  /**
   * The prefix shared by every `balance` query for a given address, across every asset
   */
  balancesByAddress: (address: string) => ["sorokit", "balance", address] as const,

  /**
   * The status of a submitted transaction, by hash
   */
  transactionStatus: (hash: string) => ["sorokit", "transactionStatus", hash] as const,

  /**
   * RPC node health and latest ledger info
   */
  networkStatus: () => ["sorokit", "networkStatus"] as const,

  /**
   * A contract's spec, fetched once per (network, contractId) and cached indefinitely
   */
  contractSpec: (networkPassphrase: string, contractId: string) =>
    ["sorokit", "contractSpec", networkPassphrase, contractId] as const,

  /**
   * The prefix shared by every `contractCall` query for a given contract
   */
  contractCallsByContract: (networkPassphrase: string, contractId: string) =>
    ["sorokit", "contractCall", networkPassphrase, contractId] as const,

  /**
   * The decoded result of simulating a specific contract call
   */
  contractCall: (networkPassphrase: string, contractId: string, method: string, args: unknown) =>
    [
      "sorokit",
      "contractCall",
      networkPassphrase,
      contractId,
      method,
      toSerializableKeyPart(args),
    ] as const,
};
