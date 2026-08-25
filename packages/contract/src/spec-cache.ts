import { Client, type Spec } from "@stellar/stellar-sdk/contract";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, type SoroformConfig } from "@soroform/core";

/**
 * Fetches and caches a contract's spec for the given config, entirely at
 * runtime from its `contractId`. This is the mechanism that makes
 * Soroform's contract hooks work with no code generation step: the first
 * call for a given (network, contractId) resolves the spec via
 * `contract.Client.from`, which transparently handles Wasm-hash lookup,
 * Wasm download, and the built-in spec for Stellar Asset Contracts; every
 * later call for the same contract reuses the cached `Spec` from the
 * query client instead of refetching.
 *
 * Cached with an infinite `staleTime`: a deployed contract's spec cannot
 * change without deploying under a new contract ID, so there is nothing
 * to invalidate.
 */
export async function fetchContractSpec(
  contractId: string,
  config: SoroformConfig,
  queryClient: QueryClient,
): Promise<Spec> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.contractSpec(config.networkPassphrase, contractId),
    queryFn: async () => {
      const client = await Client.from({
        contractId,
        rpcUrl: config.rpcUrl,
        networkPassphrase: config.networkPassphrase,
        allowHttp: config.rpcUrl.startsWith("http://"),
      });
      return client.spec;
    },
    staleTime: Infinity,
  });
}
