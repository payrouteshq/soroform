import { Api, BasicSleepStrategy } from "@stellar/stellar-sdk/rpc";
import type { SorokitConfig } from "./config.js";
import { pendingTransactions, type PendingTransaction } from "./pending-transactions.js";
import { createRpcServer } from "./rpc.js";

interface ResumePendingTransactionsOptions {
  /**
   * Stops polling and leaves any unresolved entries in the queue
   */
  signal?: AbortSignal;
  /**
   * Called once per transaction whose outcome is now known, successful or
   * not, just before it is dropped from the queue
   */
  onSettled?: (entry: PendingTransaction, response: Api.GetTransactionResponse) => void;
}

const inProgress = new Set<string>();

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
        if (signal?.aborted || response.status === Api.GetTransactionStatus.NOT_FOUND) return;
        onSettled?.(entry, response);
        pendingTransactions.remove(entry.id);
      } catch {
        // RPC unreachable, or the poll ran out of attempts. The entry stays queued so a later resume can try again
      } finally {
        inProgress.delete(entry.hash);
      }
    }),
  );
}
