import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Api } from "@stellar/stellar-sdk/rpc";
import { createRpcServer, normalizeError, queryKeys } from "@sorokit/core";
import { useSorokitConfig } from "@sorokit/provider";

export interface NetworkStatus {
  /**
   * RPC node health
   */
  health: Api.GetHealthResponse;
  /**
   * Latest ledger
   */
  latestLedger: Api.GetLatestLedgerResponse;
}

export interface UseNetworkStatusOptions {
  enabled?: boolean;
}

const REFETCH_INTERVAL_MS = 30_000;

/**
 * Fetches RPC node health and the latest ledger
 * Refetches every 30 seconds, making it suitable for a network status indicator.
 *
 * @example
 * ```tsx
 * import { useNetworkStatus } from "@sorokit/hooks";
 *
 * function StatusDot() {
 *   const { data } = useNetworkStatus();
 *   return <span>{data?.health.status ?? "unknown"}</span>;
 * }
 * ```
 */
export function useNetworkStatus(options?: UseNetworkStatusOptions): UseQueryResult<NetworkStatus> {
  const config = useSorokitConfig();

  return useQuery<NetworkStatus>({
    queryKey: queryKeys.networkStatus(),
    enabled: options?.enabled ?? true,
    refetchInterval: REFETCH_INTERVAL_MS,
    queryFn: async () => {
      const server = createRpcServer(config);
      try {
        const [health, latestLedger] = await Promise.all([
          server.getHealth(),
          server.getLatestLedger(),
        ]);
        return { health, latestLedger };
      } catch (error) {
        throw normalizeError(error);
      }
    },
  });
}
