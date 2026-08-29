import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import {
  createRpcServer,
  normalizeError,
  queryKeys,
  resolveSorokitConfig,
  type SorokitError,
  type SorokitNetwork,
} from "@sorokit/core";
import { useSorokitConfig } from "@sorokit/provider";
import { fetchContractSpec } from "./spec-cache.js";
import { generateContractSchemas } from "./generate-schemas.js";
import { toValidationError } from "./validation-error.js";

export interface UseContractCallOptions {
  /** The deployed contract's address (`C...`). */
  contractId: string;
  /** The read-only method to call. */
  method: string;
  /** Named arguments for the method, keyed by parameter name. */
  args?: Record<string, unknown>;
  /** Overrides the network from the nearest `SorokitProvider`. */
  network?: SorokitNetwork;
  /** Whether the query should run. Defaults to `true`. */
  enabled?: boolean;
}

/**
 * Simulates a read-only contract method call and returns its decoded
 * result as a TanStack Query result, so loading and error states are
 * directly usable in JSX with no extra wrapping.
 *
 * Requires no connected wallet: reads are simulation-only. The contract's
 * spec is fetched and its args schema derived automatically from just
 * `contractId`, the first time this contract is read; both are cached, so
 * there is no code generation step and no action needed when the
 * `contractId` a hook points at changes.
 *
 * @example
 * ```tsx
 * import { useContractCall } from "@sorokit/contract";
 *
 * function Balance({ contractId, address }: { contractId: string; address: string }) {
 *   const { data, isLoading, error } = useContractCall<bigint>({
 *     contractId,
 *     method: "balance",
 *     args: { id: address },
 *   });
 *   if (isLoading) return <p>Loading...</p>;
 *   if (error) return <p>{error.message}</p>;
 *   return <p>{data?.toString()}</p>;
 * }
 * ```
 */
export function useContractCall<TResult = unknown>(
  options: UseContractCallOptions,
): UseQueryResult<TResult, SorokitError> {
  const { contractId, method, args, network, enabled } = options;
  const contextConfig = useSorokitConfig();
  const config = network ? resolveSorokitConfig({ network }) : contextConfig;
  const queryClient = useQueryClient();

  return useQuery<TResult, SorokitError>({
    queryKey: queryKeys.contractCall(config.networkPassphrase, contractId, method, args ?? {}),
    enabled: (enabled ?? true) && Boolean(contractId) && Boolean(method),
    queryFn: async () => {
      try {
        const spec = await fetchContractSpec(contractId, config, queryClient);
        const schema = generateContractSchemas(spec)[method];
        const validatedArgs = schema
          ? (schema.argsSchema.parse(args ?? {}) as Record<string, unknown>)
          : (args ?? {});

        const server = createRpcServer(config);
        const { result } = await server.queryContract<TResult>(
          contractId,
          method,
          validatedArgs,
          config.networkPassphrase,
        );
        return result;
      } catch (error) {
        if (error instanceof z.ZodError) throw toValidationError(error);
        throw normalizeError(error);
      }
    },
  });
}
