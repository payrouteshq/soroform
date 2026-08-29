function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Recursively converts a value into a form safe to pass into a TanStack
 * Query key. TanStack Query hashes keys with `JSON.stringify`, which
 * throws on a raw `bigint`; Soroban contract args routinely contain
 * `bigint` (u64/u128/u256 amounts) and `Uint8Array` (bytes), so both are
 * converted to tagged strings here rather than passed through as-is. This
 * only affects the cache key, never the actual argument values used to
 * call the contract.
 */
function toSerializableKeyPart(value: unknown): unknown {
  if (typeof value === "bigint") return `bigint:${value.toString()}`;
  if (value instanceof Uint8Array) return `bytes:${bytesToHex(value)}`;
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

/**
 * Single source of truth for how TanStack Query keys are constructed
 * across Sorokit. `@sorokit/hooks`, `@sorokit/contract`, and
 * `@sorokit/devtools` all import these instead of building key arrays by
 * hand, so cache reads, invalidation, and the devtools cache viewer never
 * drift out of sync with each other.
 *
 * Every key is namespaced under `"sorokit"` so Sorokit's cache entries
 * are trivially distinguishable from a consuming app's own TanStack Query
 * usage.
 */
export const queryKeys = {
  /** The current state of a Stellar account (sequence number, existence). */
  account: (address: string) => ["sorokit", "account", address] as const,

  /** An address's balance of a given asset (native, classic, or contract). */
  balance: (address: string, assetId: string) => ["sorokit", "balance", address, assetId] as const,

  /**
   * The prefix shared by every `balance` query for a given address, across
   * every asset. Pass this to `queryClient.invalidateQueries` to refresh
   * all of an address's balances after a live event (see
   * `usePaymentStream`), without needing to know every asset that has been
   * queried.
   */
  balancesByAddress: (address: string) => ["sorokit", "balance", address] as const,

  /** The status of a submitted transaction, by hash. */
  transactionStatus: (hash: string) => ["sorokit", "transactionStatus", hash] as const,

  /** RPC node health and latest ledger info. */
  networkStatus: () => ["sorokit", "networkStatus"] as const,

  /**
   * A contract's spec, fetched once per (network, contractId) and cached
   * indefinitely: a deployed contract's spec does not change without a
   * redeploy under a new contract ID.
   */
  contractSpec: (networkPassphrase: string, contractId: string) =>
    ["sorokit", "contractSpec", networkPassphrase, contractId] as const,

  /**
   * The prefix shared by every `contractCall` query for a given contract.
   * Pass this to `queryClient.invalidateQueries` to refresh all calls for
   * a contract after a send, without needing to know every method/args
   * combination that has been queried.
   */
  contractCallsByContract: (networkPassphrase: string, contractId: string) =>
    ["sorokit", "contractCall", networkPassphrase, contractId] as const,

  /** The decoded result of simulating a specific contract call. */
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
