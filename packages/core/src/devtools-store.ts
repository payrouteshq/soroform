import type { SorokitNetwork } from "./config.js";
import type { SorokitError } from "./errors.js";

export type ContractSendStatus =
  "IDLE" | "QUEUED" | "SIMULATING" | "NEEDS_SIGNATURE" | "SUBMITTING" | "SUCCESS" | "ERROR";

export interface ContractSendTransactionSummary {
  /**
   * The built transaction's single operation type, e.g. "invokeHostFunction"
   */
  operationType: string | undefined;
  /**
   * The source account that will submit the transaction
   */
  sourceAccount: string | undefined;
  /**
   * The simulated minimum resource fee, in stroops, as a string
   */
  minResourceFee: string | undefined;
  /**
   * The full built transaction, base64-encoded XDR
   */
  transactionXdr: string | undefined;
}

export interface ContractSendLogEntry {
  /**
   * The unique identifier for the log entry
   */
  id: string;
  /**
   * The contract ID
   */
  contractId: string;
  /**
   * The method name
   */
  method: string;
  /**
   * The status of the contract send
   */
  status: ContractSendStatus;
  /**
   * The arguments for the contract send
   */
  args?: unknown;
  /**
   * The result of the contract send
   */
  result?: unknown;
  /**
   * The error of the contract send
   */
  error?: SorokitError;
  transaction?: ContractSendTransactionSummary;
  /**
   * The network the send was submitted to
   */
  network?: SorokitNetwork;
  /**
   * The submitted transaction's hash, once the network has accepted it
   */
  hash?: string;
  /**
   * The timestamp of the last update
   */
  updatedAt: number;
}

type Listener = () => void;

class DevtoolsSendLogStore {
  private entries = new Map<string, ContractSendLogEntry>();
  private listeners = new Set<Listener>();

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

export const devtoolsSendLog = new DevtoolsSendLogStore();
