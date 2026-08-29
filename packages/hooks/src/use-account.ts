import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { createRpcServer, normalizeError, queryKeys } from "@sorokit/core";
import { useSorokitConfig } from "@sorokit/provider";

/** The current state of a Stellar account, as returned by `useAccount`. */
export interface AccountState {
  /** Whether the account exists on-chain. */
  exists: boolean;
  /** The account's current sequence number, if it exists. */
  sequence: string | undefined;
}

export interface UseAccountOptions {
  enabled?: boolean;
}

/**
 * Fetches a Stellar account's existence and sequence number, via
 * `rpc.Server.getAccount`.
 *
 * A missing account is not treated as a query error: `rpc.Server.getAccount`
 * throws for any account that does not exist on-chain, so that specific
 * failure is caught and reported as `{ exists: false, sequence: undefined }`
 * instead, leaving genuine network or RPC errors to surface through the
 * query's own `error` field as usual.
 *
 * @example
 * ```tsx
 * import { useAccount } from "@sorokit/hooks";
 *
 * function AccountBadge({ address }: { address: string }) {
 *   const { data, isLoading } = useAccount(address);
 *   if (isLoading) return <p>Loading...</p>;
 *   return <p>{data?.exists ? `Sequence ${data.sequence}` : "Not found"}</p>;
 * }
 * ```
 */
export function useAccount(
  address: string,
  options?: UseAccountOptions,
): UseQueryResult<AccountState> {
  const config = useSorokitConfig();

  return useQuery<AccountState>({
    queryKey: queryKeys.account(address),
    enabled: (options?.enabled ?? true) && Boolean(address),
    queryFn: async () => {
      const server = createRpcServer(config);
      try {
        const account = await server.getAccount(address);
        return { exists: true, sequence: account.sequenceNumber() };
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Account not found")) {
          return { exists: false, sequence: undefined };
        }
        throw normalizeError(error);
      }
    },
  });
}
