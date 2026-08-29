/**
 * A transaction the network has accepted but whose outcome this client has
 * not seen yet. Sorokit persists these so a page refresh mid-submission
 * is recoverable: the transaction is already on its way to the ledger, and
 * the only thing lost by a reload is the polling loop watching for it.
 */
export interface PendingTransaction {
  /** Matches the `id` of the `useContractSend` devtools log entry that created it. */
  id: string;
  /** The transaction hash returned by `sendTransaction`. */
  hash: string;
  /** The source account that submitted it. */
  address: string;
  /** The network it was submitted to, so entries for other networks are ignored. */
  networkPassphrase: string;
  contractId: string;
  method: string;
  /** When the network accepted it, as a Unix epoch in milliseconds. */
  submittedAt: number;
}

type Listener = () => void;

/** The `localStorage` key the pending queue is persisted under. */
const STORAGE_KEY = "sorokit.pending-transactions.v1";

/**
 * How long a pending entry is worth resuming. A Stellar transaction that
 * has not been included within a few minutes never will be — its time
 * bounds have long expired — so anything older is dropped on load rather
 * than polled for forever.
 */
const MAX_AGE_MS = 10 * 60 * 1000;

function isPendingTransaction(value: unknown): value is PendingTransaction {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.hash === "string" &&
    typeof entry.address === "string" &&
    typeof entry.networkPassphrase === "string" &&
    typeof entry.contractId === "string" &&
    typeof entry.method === "string" &&
    typeof entry.submittedAt === "number"
  );
}

/**
 * The queue of submitted-but-unconfirmed transactions, mirrored into
 * `localStorage` so it survives a page reload.
 *
 * Reads and writes to storage are best-effort: every access is guarded, so
 * this works unchanged during server rendering, in a browser with storage
 * blocked, and when the quota is exhausted. In those cases the queue is
 * simply in-memory and a reload starts empty, which is the behavior
 * Sorokit had before persistence existed.
 *
 * The in-memory map is this tab's source of truth; the store hydrates from
 * storage once, at construction. It deliberately does not follow another
 * tab's writes, so two tabs each resume the transactions they submitted
 * rather than racing to poll for each other's.
 *
 * @example
 * ```ts
 * import { pendingTransactions } from "@sorokit/core";
 *
 * const unsubscribe = pendingTransactions.subscribe(() => {
 *   console.log(pendingTransactions.getAll().length, "transactions in flight");
 * });
 * ```
 */
export class PendingTransactionStore {
  private entries = new Map<string, PendingTransaction>();
  private listeners = new Set<Listener>();
  /**
   * `getAll()`'s result, cached until the next mutation so it returns a
   * stable reference. `React.useSyncExternalStore` requires a `getSnapshot`
   * that is `Object.is`-equal between unchanged reads, or it re-renders in
   * a loop.
   */
  private cachedSnapshot: PendingTransaction[] | null = null;
  private hydrated = false;

  /** Records a transaction the network has accepted. */
  add(entry: PendingTransaction): void {
    this.hydrate();
    this.entries.set(entry.id, entry);
    this.commit();
  }

  /** Drops a transaction once its outcome is known, or it is abandoned. */
  remove(id: string): void {
    this.hydrate();
    if (!this.entries.delete(id)) return;
    this.commit();
  }

  /** Every pending transaction, oldest first. */
  getAll(): PendingTransaction[] {
    this.hydrate();
    if (!this.cachedSnapshot) {
      this.cachedSnapshot = Array.from(this.entries.values()).sort(
        (a, b) => a.submittedAt - b.submittedAt,
      );
    }
    return this.cachedSnapshot;
  }

  clear(): void {
    this.hydrated = true;
    this.entries.clear();
    this.commit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private storage(): Storage | null {
    try {
      return typeof localStorage === "undefined" ? null : localStorage;
    } catch {
      // Some browsers throw on `localStorage` access rather than returning null.
      return null;
    }
  }

  private hydrate(): void {
    if (this.hydrated) return;
    this.hydrated = true;

    const raw = (() => {
      try {
        return this.storage()?.getItem(STORAGE_KEY) ?? null;
      } catch {
        return null;
      }
    })();
    if (!raw) return;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const cutoff = Date.now() - MAX_AGE_MS;
      for (const entry of parsed) {
        if (isPendingTransaction(entry) && entry.submittedAt >= cutoff) {
          this.entries.set(entry.id, entry);
        }
      }
    } catch {
      // A corrupt or foreign value under our key is not worth surfacing;
      // the next write overwrites it.
    }
  }

  private commit(): void {
    this.cachedSnapshot = null;
    try {
      const storage = this.storage();
      if (storage) {
        if (this.entries.size === 0) storage.removeItem(STORAGE_KEY);
        else storage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.entries.values())));
      }
    } catch {
      // Storage full, or blocked mid-session. The in-memory queue still works.
    }
    for (const listener of this.listeners) listener();
  }
}

/**
 * The shared pending-transaction queue. `useContractSend` adds to it the
 * moment the network accepts a transaction and removes the entry once the
 * outcome is known; `resumePendingTransactions` (called for you by
 * `SorokitProvider`) drains whatever a reload left behind.
 */
export const pendingTransactions = new PendingTransactionStore();
