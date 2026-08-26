import type { SoroformError } from "./errors.js";

/**
 * The literal states a `useContractSend` call moves through, exposed
 * directly (rather than a boolean `isLoading`) so a consuming app can
 * render distinct UI per phase.
 */
export type ContractSendStatus =
  | "idle"
  | "simulating"
  | "needsSignature"
  | "submitting"
  | "success"
  | "error";

/**
 * A readable summary of a built transaction's operation and Soroban
 * resource footprint, captured once `AssembledTransaction.build` succeeds.
 * Deliberately not a full XDR tree decode (see `@soroform/devtools`);
 * `transactionXdr` is kept alongside it so a devtools UI can offer a raw
 * copy button for anything this summary does not surface.
 */
export interface ContractSendTransactionSummary {
  /** The built transaction's single operation type, e.g. "invokeHostFunction". */
  operationType: string | undefined;
  /** The source account that will submit the transaction. */
  sourceAccount: string | undefined;
  /** The simulated minimum resource fee, in stroops, as a string. */
  minResourceFee: string | undefined;
  /** The full built transaction, base64-encoded XDR. */
  transactionXdr: string | undefined;
}

/**
 * One logged `useContractSend` invocation, as recorded by
 * `@soroform/contract` and read by `@soroform/devtools`.
 */
export interface ContractSendLogEntry {
  id: string;
  contractId: string;
  method: string;
  status: ContractSendStatus;
  args?: unknown;
  result?: unknown;
  error?: SoroformError;
  transaction?: ContractSendTransactionSummary;
  updatedAt: number;
}

type Listener = () => void;

/**
 * A minimal in-memory pub-sub store logging `useContractSend` activity
 * for `@soroform/devtools` to display. Lives in `@soroform/core`, not in
 * either package that actually cares about it, so that `@soroform/contract`
 * can write to it without depending on `@soroform/devtools`, and
 * `@soroform/devtools` can read from it without depending on
 * `@soroform/contract`. Recording is a no-op with no listeners subscribed,
 * so it stays effectively free when devtools is not installed.
 */
class DevtoolsSendLogStore {
  private entries = new Map<string, ContractSendLogEntry>();
  private listeners = new Set<Listener>();
  /**
   * `getAll()`'s result cached until the next mutation, so it returns a
   * stable reference between calls when nothing has changed. This matters
   * for `React.useSyncExternalStore` (used by `@soroform/devtools`), whose
   * contract requires `getSnapshot` to return `Object.is`-equal results
   * when the underlying data has not changed, or it will re-render in a
   * loop.
   */
  private cachedSnapshot: ContractSendLogEntry[] | null = null;

  record(entry: ContractSendLogEntry): void {
    this.entries.set(entry.id, entry);
    this.cachedSnapshot = null;
    this.emit();
  }

  getAll(): ContractSendLogEntry[] {
    if (!this.cachedSnapshot) {
      this.cachedSnapshot = Array.from(this.entries.values()).sort(
        (a, b) => a.updatedAt - b.updatedAt,
      );
    }
    return this.cachedSnapshot;
  }

  clear(): void {
    this.entries.clear();
    this.cachedSnapshot = null;
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/**
 * The shared devtools send-log store instance. `useContractSend` calls
 * `devtoolsSendLog.record(...)` on every status transition (guarded by
 * `process.env.NODE_ENV === "development"`); `<SoroformDevtools>` calls
 * `devtoolsSendLog.subscribe(...)` and `getAll()` to render it.
 */
export const devtoolsSendLog = new DevtoolsSendLogStore();
