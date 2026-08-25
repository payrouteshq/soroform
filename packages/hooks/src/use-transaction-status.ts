import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { BasicSleepStrategy, type Api } from "@stellar/stellar-sdk/rpc";
import { createRpcServer, normalizeError, queryKeys } from "@soroform/core";
import { useSoroformConfig } from "@soroform/provider";

export interface UseTransactionStatusOptions {
  enabled?: boolean;
}

/**
 * Polls for a submitted transaction's final status, via
 * `rpc.Server.pollTransaction` (using the SDK's own `BasicSleepStrategy`
 * between attempts, not a hand-rolled polling loop). Resolves once the
 * transaction is found (successful or failed) or the poll's attempt limit
 * is reached.
 *
 * @example
 * ```tsx
 * import { useTransactionStatus } from "@soroform/hooks";
 *
 * function TxStatus({ hash }: { hash: string }) {
 *   const { data, isLoading } = useTransactionStatus(hash);
 *   if (isLoading) return <p>Polling...</p>;
 *   return <p>{data?.status}</p>;
 * }
 * ```
 */
export function useTransactionStatus(
  hash: string,
  options?: UseTransactionStatusOptions,
): UseQueryResult<Api.GetTransactionResponse> {
  const config = useSoroformConfig();

  return useQuery<Api.GetTransactionResponse>({
    queryKey: queryKeys.transactionStatus(hash),
    enabled: (options?.enabled ?? true) && Boolean(hash),
    queryFn: async () => {
      const server = createRpcServer(config);
      try {
        return await server.pollTransaction(hash, { sleepStrategy: BasicSleepStrategy });
      } catch (error) {
        throw normalizeError(error);
      }
    },
  });
}
