import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AssembledTransaction, Watcher } from "@stellar/stellar-sdk/contract";
import type { Api } from "@stellar/stellar-sdk/rpc";
import { z } from "zod";
import {
  devtoolsSendLog,
  normalizeError,
  pendingTransactions,
  queryKeys,
  resolveSorokitConfig,
  transactionSequencer,
  type ContractSendLogEntry,
  type ContractSendStatus,
  type SorokitError,
  type SorokitNetwork,
} from "@sorokit/core";
import { useSorokitConfig } from "@sorokit/provider";
import { useWallet } from "@sorokit/wallet-adapter";
import { fetchContractSpec } from "./spec-cache.js";
import { generateContractSchemas } from "./generate-schemas.js";
import { toValidationError } from "./validation-error.js";

export type { ContractSendStatus };

export interface UseContractSendOptions {
  /**
   * The deployed contract's address (`C...`).
   */
  contractId: string;
  /**
   * The state-changing method to call.
   */
  method: string;
  /**
   * Overrides the network from the nearest `SorokitProvider`.
   */
  network?: SorokitNetwork;
}

export interface UseContractSendResult<TResult = unknown> {
  /**
   * The current phase of the send, for rendering distinct UI per phase.
   */
  status: ContractSendStatus;
  /**
   * The decoded result, once `status` is `"success"`.
   */
  data: TResult | undefined;
  /**
   * The normalized error, once `status` is `"error"`.
   */
  error: SorokitError | undefined;
  /**
   * The submitted transaction's hash, from the moment the network accepts it.
   */
  hash: string | undefined;
  /**
   * Validates args, simulates, signs, and sends the transaction.
   */
  sendAsync: (args?: Record<string, unknown>) => Promise<TResult>;
  /**
   * Resets `status`, `data`, `error`, and `hash` back to their initial values.
   */
  reset: () => void;
}

const __DEV__ = process.env.NODE_ENV !== "production";

class SubmissionWatcher extends Watcher {
  constructor(private readonly onHash: (hash: string) => void) {
    super();
  }

  onSubmitted(response?: Api.SendTransactionResponse): void {
    if (response?.hash) this.onHash(response.hash);
  }

  onProgress(): void {
    // Per-attempt polling progress is not surfaced; `status` covers it.
  }
}

/**
 *
 * @example
 * ```tsx
 * import { useContractSend } from "@sorokit/contract";
 *
 * function TransferButton({ contractId }: { contractId: string }) {
 *   const { status, sendAsync, error } = useContractSend({
 *     contractId,
 *     method: "transfer",
 *   });
 *   return (
 *     <div>
 *       <button
 *         disabled={status === "simulating" || status === "submitting"}
 *         onClick={() => sendAsync({ to: "G...", amount: 100n })}
 *       >
 *         {status === "idle" || status === "success" ? "Transfer" : status}
 *       </button>
 *       {error && <p>{error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useContractSend<TResult = unknown>(
  options: UseContractSendOptions,
): UseContractSendResult<TResult> {
  const { contractId, method, network } = options;
  const contextConfig = useSorokitConfig();
  const config = network ? resolveSorokitConfig({ network }) : contextConfig;
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<ContractSendStatus>("IDLE");
  const [hash, setHash] = React.useState<string | undefined>(undefined);

  const latestRunId = React.useRef(0);

  const mutation = useMutation<TResult, SorokitError, Record<string, unknown> | undefined>({
    mutationFn: async (args) => {
      const runId = (latestRunId.current += 1);
      const id = `${contractId}:${method}:${Date.now()}:${Math.random()}`;
      const address = wallet.address;
      if (!address) {
        throw normalizeError(new Error("Connect a wallet before sending a transaction."));
      }

      let logged: Partial<ContractSendLogEntry> = {};
      const set = (partial: Partial<ContractSendLogEntry>) => {
        logged = { ...logged, ...partial };
        if (runId === latestRunId.current) {
          if (partial.status) setStatus(partial.status);
          if (partial.hash) setHash(partial.hash);
        }
        if (!__DEV__) return;
        devtoolsSendLog.record({
          id,
          contractId,
          method,
          args,
          network: config.network,
          updatedAt: Date.now(),
          status: "IDLE",
          ...logged,
        });
      };

      try {
        set({ status: "QUEUED" });

        return await transactionSequencer.enqueue<TResult>({
          config,
          address,
          onStart: () => set({ status: "SIMULATING" }),
          task: async ({ server, markSubmitted }) => {
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
              server,
              publicKey: address,
              method,
              args: scVals,
              parseResultXdr: (xdrResult) => spec.funcResToNative(method, xdrResult) as TResult,
              signTransaction: wallet.signTransaction,
              signAuthEntry: wallet.signAuthEntry,
            });

            set({
              status: "NEEDS_SIGNATURE",
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

            set({ status: "SUBMITTING" });

            let submittedHash: string | undefined;
            const watcher = new SubmissionWatcher((submitted) => {
              submittedHash = submitted;
              pendingTransactions.add({
                id,
                hash: submitted,
                address,
                networkPassphrase: config.networkPassphrase,
                contractId,
                method,
                submittedAt: Date.now(),
              });
              set({ hash: submitted });
              markSubmitted();
            });

            try {
              const sentTx = await tx.send(watcher);
              if (submittedHash) pendingTransactions.remove(id);
              set({ status: "SUCCESS", result: sentTx.result });
              return sentTx.result;
            } catch (error) {
              // A transaction the network accepted but that has not turned
              // up in a ledger yet is exactly what a resume after reload is
              // for, so it stays queued. Any other failure has an outcome
              // already; there is nothing left to poll for.
              if (submittedHash && normalizeError(error).kind !== "TRANSACTION_STILL_PENDING") {
                pendingTransactions.remove(id);
              }
              throw error;
            }
          },
        });
      } catch (rawError) {
        const normalized =
          rawError instanceof z.ZodError ? toValidationError(rawError) : normalizeError(rawError);
        set({ status: "ERROR", error: normalized });
        throw normalized;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contractCallsByContract(config.networkPassphrase, contractId),
      });
    },
  });

  const sendAsync = React.useCallback(
    (args?: Record<string, unknown>) => mutation.mutateAsync(args),
    [mutation],
  );

  const reset = React.useCallback(() => {
    setStatus("IDLE");
    setHash(undefined);
    mutation.reset();
  }, [mutation]);

  return {
    status,
    data: mutation.data,
    error: mutation.error ?? undefined,
    hash,
    sendAsync,
    reset,
  };
}
