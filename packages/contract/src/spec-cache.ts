import { Client, type Spec } from "@stellar/stellar-sdk/contract";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, type SorokitConfig } from "@sorokit/core";

export async function fetchContractSpec(
  contractId: string,
  config: SorokitConfig,
  queryClient: QueryClient,
): Promise<Spec> {
  return queryClient.query({
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
    // A deployed contract's spec cannot change without deploying under a new contract ID, so there is nothing to invalidate.
    staleTime: Infinity,
  });
}
