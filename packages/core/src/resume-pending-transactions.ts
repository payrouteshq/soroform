import { Api, BasicSleepStrategy } from "@stellar/stellar-sdk/rpc";
import type { SorokitConfig } from "./config.js";
import { pendingTransactions, type PendingTransaction } from "./pending-transactions.js";
import { createRpcServer } from "./rpc.js";

interface ResumePendingTransactionsOptions {
  /** Stops polling and leaves any unresolved entries in the queue. */
  signal?: AbortSignal;
  /**
   * Called once per transaction whose outcome is now known, successful or
   * not, just before it is dropped from the queue. This is where a
   * consuming layer refreshes whatever the transaction changed —
   * `SorokitProvider` uses it to invalidate the contract's cached reads.
   */
  onSettled?: (entry: PendingTransaction, response: Api.GetTransactionResponse) => void;
}

/** Hashes currently being polled, so overlapping calls do not poll twice. */
const inProgress = new Set<string>();

/**
 * Picks up transactions that were in flight when the page was last
 * unloaded and polls them to completion.
 *
 * A submitted Stellar transaction is the network's problem, not the
 * browser's: once RPC has accepted it, reloading the page cannot stop it
 * from landing. Without this, a refresh during the `"submitting"` phase
 * loses the only thing that was watching for the outcome, and the app
 * shows stale state for a transaction that actually succeeded.
 *
 * Only entries matching `config.networkPassphrase` are resumed, so an app
 * that switches networks does not poll one network's RPC for another
 * network's transactions. Entries are removed as they settle; entries
 * whose outcome is still unknown are left for the next attempt and are
 * discarded by {@link PendingTransactionStore} once they are too old to
 * still be includable.
 *
 * `SorokitProvider` calls this on mount, so most apps never call it
 * directly.
 *
 * @example
 * ```ts
 * import { resolveSorokitConfig, resumePendingTransactions } from "@sorokit/core";
 *
 * await resumePendingTransactions(resolveSorokitConfig({ network: "testnet" }), {
 *   onSettled: (entry) => console.log("landed:", entry.method, entry.hash),
 * });
 * ```
 */
export async function resumePendingTransactions(
  config: SorokitConfig,
  options: ResumePendingTransactionsOptions = {},
): Promise<void> {
  const { signal, onSettled } = options;

  const resumable = pendingTransactions
    .getAll()
    .filter(
      (entry) =>
        entry.networkPassphrase === config.networkPassphrase && !inProgress.has(entry.hash),
    );
  if (resumable.length === 0) return;

  const server = createRpcServer(config);

  await Promise.all(
    resumable.map(async (entry) => {
      inProgress.add(entry.hash);
      try {
        const response = await server.pollTransaction(entry.hash, {
          sleepStrategy: BasicSleepStrategy,
        });
        // A transaction still not found is left queued for the next
        // attempt, and ages out of the store on its own if it never lands.
        if (signal?.aborted || response.status === Api.GetTransactionStatus.NOT_FOUND) return;
        onSettled?.(entry, response);
        pendingTransactions.remove(entry.id);
      } catch {
        // RPC unreachable, or the poll ran out of attempts. The entry stays
        // queued so a later resume can try again.
      } finally {
        inProgress.delete(entry.hash);
      }
    }),
  );
}
