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
  /** The deployed contract's address (`C...`). */
  contractId: string;
  /** The state-changing method to call. */
  method: string;
  /** Overrides the network from the nearest `SorokitProvider`. */
  network?: SorokitNetwork;
}

export interface UseContractSendResult<TResult = unknown> {
  /** The current phase of the send, for rendering distinct UI per phase. */
  status: ContractSendStatus;
  /** The decoded result, once `status` is `"success"`. */
  data: TResult | undefined;
  /** The normalized error, once `status` is `"error"`. */
  error: SorokitError | undefined;
  /** The submitted transaction's hash, from the moment the network accepts it. */
  hash: string | undefined;
  /** Validates args, simulates, signs, and sends the transaction. */
  sendAsync: (args?: Record<string, unknown>) => Promise<TResult>;
  /** Resets `status`, `data`, `error`, and `hash` back to their initial values. */
  reset: () => void;
}

function isDevelopment(): boolean {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "development";
}

/**
 * Reports the transaction hash the moment RPC accepts the transaction,
 * rather than only when `send()` resolves several seconds later. That
 * moment is the one that matters: the sequence number is spoken for, the
 * transaction is on its way to the ledger whether or not this tab stays
 * open, and everything downstream — releasing the account's queue,
 * persisting the transaction for resume after a reload — keys off it.
 */
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
 * Builds, simulates, signs, and sends a state-changing contract method
 * call, exposing the full `queue -> build -> simulate -> sign -> send`
 * lifecycle as a `status` field (`"idle" | "queued" | "simulating" |
 * "needsSignature" | "submitting" | "success" | "error"`) rather than a
 * single boolean, so a consuming app can render distinct UI per phase.
 *
 * Every send is routed through Sorokit's global `transactionSequencer`,
 * keyed by the connected wallet address. This is what makes a double-click
 * on a Transfer button, or two components each firing a send, safe: a
 * Stellar transaction's sequence number must be exactly one past the
 * account's current one, so sends that are assembled concurrently would
 * otherwise claim the same number and the second to land would fail with
 * `tx_bad_seq`. The sequencer serializes assembly per account and projects
 * the sequence number forward as transactions are accepted, so a burst of
 * sends is submitted back to back rather than one per ledger close.
 *
 * Once the network accepts a transaction it is recorded in
 * `pendingTransactions`, which is mirrored into `localStorage`. If the page
 * is reloaded while a send is `"submitting"`, `SorokitProvider` resumes
 * polling for the outcome on mount instead of losing it.
 *
 * Requires a connected wallet (see `useWallet` from `@sorokit/wallet-adapter`).
 * On success, invalidates every `useContractCall` query for this contract,
 * so calls reflect the new state automatically. On error, the thrown
 * error is normalized via `@sorokit/core`'s `normalizeError` before being
 * exposed.
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
  const [status, setStatus] = React.useState<ContractSendStatus>("idle");
  const [hash, setHash] = React.useState<string | undefined>(undefined);

  /**
   * Sends are queued, so one hook can have several of them outstanding at
   * once. Only the most recently started send drives `status` and `hash`;
   * without this, a send still waiting its turn would keep overwriting the
   * phase of the one that is actually signing.
   */
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
        if (!isDevelopment()) return;
        devtoolsSendLog.record({
          id,
          contractId,
          method,
          args,
          updatedAt: Date.now(),
          status: "idle",
          ...logged,
        });
      };

      try {
        set({ status: "queued" });

        return await transactionSequencer.enqueue<TResult>({
          config,
          address,
          onStart: () => set({ status: "simulating" }),
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
              // The sequencer's server reports the sequence number this
              // send reserved, instead of the one the last closed ledger
              // knows about.
              server,
              publicKey: address,
              method,
              args: scVals,
              parseResultXdr: (xdrResult) => spec.funcResToNative(method, xdrResult) as TResult,
              signTransaction: wallet.signTransaction,
              signAuthEntry: wallet.signAuthEntry,
            });

            set({
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

            set({ status: "submitting" });

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
              set({ status: "success", result: sentTx.result });
              return sentTx.result;
            } catch (error) {
              // A transaction the network accepted but that has not turned
              // up in a ledger yet is exactly what a resume after reload is
              // for, so it stays queued. Any other failure has an outcome
              // already; there is nothing left to poll for.
              if (submittedHash && normalizeError(error).kind !== "transaction-still-pending") {
                pendingTransactions.remove(id);
              }
              throw error;
            }
          },
        });
      } catch (rawError) {
        const normalized =
          rawError instanceof z.ZodError ? toValidationError(rawError) : normalizeError(rawError);
        set({ status: "error", error: normalized });
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
    setStatus("idle");
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
