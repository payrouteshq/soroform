import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AssembledTransaction } from "@stellar/stellar-sdk/contract";
import {
  devtoolsWriteLog,
  normalizeError,
  queryKeys,
  resolveSoroformConfig,
  type ContractWriteLogEntry,
  type ContractWriteStatus,
  type SoroformError,
  type SoroformNetwork,
} from "@soroform/core";
import { useSoroformConfig } from "@soroform/provider";
import { useWallet } from "@soroform/wallet";
import { fetchContractSpec } from "./spec-cache.js";
import { generateContractSchemas } from "./generate-schemas.js";

export type { ContractWriteStatus };

export interface UseContractWriteOptions {
  /** The deployed contract's address (`C...`). */
  contractId: string;
  /** The state-changing method to call. */
  method: string;
  /** Overrides the network from the nearest `SoroformProvider`. */
  network?: SoroformNetwork;
}

export interface UseContractWriteResult<TResult = unknown> {
  /** The current phase of the write, for rendering distinct UI per phase. */
  status: ContractWriteStatus;
  /** The decoded result, once `status` is `"success"`. */
  data: TResult | undefined;
  /** The normalized error, once `status` is `"error"`. */
  error: SoroformError | undefined;
  /** Validates args, simulates, signs, and sends the transaction. */
  writeAsync: (args?: Record<string, unknown>) => Promise<TResult>;
  /** Resets `status`, `data`, and `error` back to their initial values. */
  reset: () => void;
}

function isDevelopment(): boolean {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "development";
}

/**
 * Builds, simulates, signs, and sends a state-changing contract method
 * call, exposing the full `build -> simulate -> sign -> send` lifecycle as
 * a `status` field (`"idle" | "simulating" | "needsSignature" |
 * "submitting" | "success" | "error"`) rather than a single boolean, so a
 * consuming app can render distinct UI per phase.
 *
 * Requires a connected wallet (see `useWallet` from `@soroform/wallet`).
 * On success, invalidates every `useContractRead` query for this contract,
 * so reads reflect the new state automatically. On error, the thrown
 * error is normalized via `@soroform/core`'s `normalizeError` before being
 * exposed.
 *
 * @example
 * ```tsx
 * import { useContractWrite } from "@soroform/contract";
 *
 * function TransferButton({ contractId }: { contractId: string }) {
 *   const { status, writeAsync, error } = useContractWrite({
 *     contractId,
 *     method: "transfer",
 *   });
 *   return (
 *     <div>
 *       <button
 *         disabled={status === "simulating" || status === "submitting"}
 *         onClick={() => writeAsync({ to: "G...", amount: 100n })}
 *       >
 *         {status === "idle" || status === "success" ? "Transfer" : status}
 *       </button>
 *       {error && <p>{error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useContractWrite<TResult = unknown>(
  options: UseContractWriteOptions,
): UseContractWriteResult<TResult> {
  const { contractId, method, network } = options;
  const contextConfig = useSoroformConfig();
  const config = network ? resolveSoroformConfig({ network }) : contextConfig;
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ContractWriteStatus>("idle");

  const mutation = useMutation<TResult, SoroformError, Record<string, unknown> | undefined>({
    mutationFn: async (args) => {
      const id = `${contractId}:${method}:${Date.now()}:${Math.random()}`;

      const log = (partial: Partial<ContractWriteLogEntry>) => {
        if (!isDevelopment()) return;
        devtoolsWriteLog.record({
          id,
          contractId,
          method,
          args,
          updatedAt: Date.now(),
          status: partial.status ?? "idle",
          ...partial,
        });
      };

      try {
        setStatus("simulating");
        log({ status: "simulating" });

        const spec = await fetchContractSpec(contractId, config, queryClient);
        const schema = generateContractSchemas(spec)[method];
        const validatedArgs = schema
          ? (schema.argsSchema.parse(args ?? {}) as Record<string, unknown>)
          : (args ?? {});
        const scVals = spec.funcArgsToScVals(method, validatedArgs);

        const tx = await AssembledTransaction.build<TResult>({
          contractId,
          networkPassphrase: config.networkPassphrase,
          rpcUrl: config.rpcUrl,
          publicKey: wallet.address,
          method,
          args: scVals,
          parseResultXdr: (xdrResult) => spec.funcResToNative(method, xdrResult) as TResult,
          signTransaction: wallet.signTransaction,
          signAuthEntry: wallet.signAuthEntry,
        });

        setStatus("needsSignature");
        log({
          status: "needsSignature",
          transaction: {
            operationType: tx.built?.operations[0]?.type,
            sourceAccount: tx.built?.source,
            minResourceFee:
              tx.simulation && "minResourceFee" in tx.simulation
                ? tx.simulation.minResourceFee
                : undefined,
            transactionXdr: tx.built ? tx.toXdr() : undefined,
          },
        });
        await tx.sign();

        setStatus("submitting");
        log({ status: "submitting" });
        const sentTx = await tx.send();

        setStatus("success");
        log({ status: "success", result: sentTx.result });
        return sentTx.result;
      } catch (rawError) {
        const normalized = normalizeError(rawError);
        setStatus("error");
        log({ status: "error", error: normalized });
        throw normalized;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contractReadsByContract(config.networkPassphrase, contractId),
      });
    },
  });

  const writeAsync = useCallback(
    (args?: Record<string, unknown>) => mutation.mutateAsync(args),
    [mutation],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    mutation.reset();
  }, [mutation]);

  return {
    status,
    data: mutation.data,
    error: mutation.error ?? undefined,
    writeAsync,
    reset,
  };
}
