import { Account } from "@stellar/stellar-sdk";
import type { SorokitConfig } from "./config.js";
import { createRpcServer, type RpcServer } from "./rpc.js";

/** What a queued send is handed when its turn comes up. */
interface SequencedTransactionContext {
  /**
   * The RPC server to build the transaction with. It behaves exactly like
   * the one {@link createRpcServer} returns, except that `getAccount` for
   * the queued address reports the *projected* sequence number this slot
   * reserved rather than the last one the network has seen.
   */
  server: RpcServer;
  /**
   * Call this as soon as the network has accepted the transaction: it
   * commits the reservation and releases the account's lane to the next
   * queued send, without waiting for the ledger to close.
   */
  markSubmitted(): void;
}

interface Lane {
  /**
   * The account sequence number to build the next transaction from — one
   * past the last reservation this lane committed. `null` means nothing is
   * projected and the network's own answer is authoritative.
   */
  projected: bigint | null;
  /** Submitted-but-not-yet-settled transactions from this lane. */
  inFlight: number;
  /**
   * Set when a submission failed in a way that may not have consumed its
   * sequence number, so the projection can no longer be trusted. Honored
   * once the lane drains, since re-reading the network while earlier
   * transactions are still in flight would hand out a number they already
   * claimed.
   */
  needsResync: boolean;
  /**
   * Resolves once every send queued on this lane so far has released it. A
   * new send waits on it and installs its own. Never rejects, so one
   * failed send does not poison the ones behind it.
   */
  tail: Promise<void>;
}

/**
 * Wraps an RPC server so `getAccount` for one address reports a sequence
 * number the sequencer chose, leaving every other method (and every other
 * address) untouched. This is the seam that lets Sorokit drive sequence
 * numbers without forking `AssembledTransaction`, which otherwise resolves
 * the account itself.
 *
 * A fresh `Account` is returned per call because `TransactionBuilder.build`
 * mutates the account it is given, and the SDK may resolve the account
 * more than once while assembling (for instance on the state-restore path).
 */
function withProjectedSequence(server: RpcServer, address: string, sequence: string): RpcServer {
  return new Proxy(server, {
    get(target, property, receiver) {
      if (property === "getAccount") {
        return async (accountId: string) =>
          accountId === address ? new Account(address, sequence) : target.getAccount(accountId);
      }
      const value = Reflect.get(target, property, receiver) as unknown;
      // Bound to `target`, not the proxy: `rpc.Server` reads private fields,
      // which throw when accessed through a Proxy receiver.
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/**
 * The global transaction sequencer: one queue per (network, account) that
 * hands out Stellar sequence numbers so concurrent sends from the same
 * wallet cannot collide. `useContractSend` routes every send through it, so
 * two hooks in unrelated parts of a React tree still queue behind each
 * other when they share a wallet. Nothing needs to be configured or wired
 * up for that to happen.
 *
 * Stellar transactions carry a sequence number that must be exactly one
 * past the account's current one. React apps break this constantly — two
 * components each firing a send, or a user double-clicking a button —
 * because each flow independently reads the account, gets the same number,
 * and the second transaction to land fails with `tx_bad_seq`. Simply
 * serializing does not fix it either: RPC reports the account as of the
 * last closed ledger, so a second transaction assembled right after the
 * first was submitted still reads the pre-first sequence number.
 *
 * So the sequencer does two things. It serializes assembly per account, and
 * it projects the sequence number forward as transactions are accepted
 * rather than re-reading a ledger that has not caught up — which is what
 * lets a burst of sends go out back to back instead of one per ~5 second
 * ledger close. The projection is always taken as a floor against the
 * network's own answer, so a sequence number bumped by something outside
 * Sorokit — another tab, a CLI, the wallet itself — wins.
 *
 * The one thing this trades away: a queued send is simulated against a
 * ledger that does not yet contain the send ahead of it. That is fine for
 * the overwhelmingly common case of repeated independent calls, and wrong
 * only if a call's storage footprint or authorization depends on what the
 * previous call wrote — in which case await the first send before starting
 * the second.
 */
export class TransactionSequencer {
  private lanes = new Map<string, Lane>();

  /**
   * Queues `task` behind every other send already queued for this account,
   * and runs it with a reserved sequence number once its turn comes up.
   *
   * @returns whatever `task` resolves to. A failing task does not block the
   * ones queued behind it.
   */
  async enqueue<T>(options: {
    config: SorokitConfig;
    address: string;
    /** Called when the send reaches the front of the queue, before any RPC call. */
    onStart?: () => void;
    task: (context: SequencedTransactionContext) => Promise<T>;
  }): Promise<T> {
    const { config, address, task, onStart } = options;
    const lane = this.lane(config.networkPassphrase, address);

    const previous = lane.tail;
    let releaseLane!: () => void;
    lane.tail = previous.then(() => new Promise<void>((resolve) => (releaseLane = resolve)));

    await previous;

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      releaseLane();
    };

    try {
      onStart?.();
      const sequence = await this.reserve(lane, config, address);
      const server = withProjectedSequence(createRpcServer(config), address, sequence);

      let submitted = false;
      const markSubmitted = () => {
        if (submitted) return;
        submitted = true;
        // The reservation is only committed once the network has taken the
        // transaction; a build or signature that never got that far leaves
        // the sequence number free for the next send.
        lane.projected = BigInt(sequence) + 1n;
        lane.inFlight += 1;
        release();
      };

      try {
        return await task({ server, markSubmitted });
      } catch (error) {
        if (submitted) lane.needsResync = true;
        throw error;
      } finally {
        if (submitted) lane.inFlight -= 1;
      }
    } finally {
      release();
    }
  }

  /**
   * Resolves the account sequence number the next transaction should be
   * built from: the network's answer, or this lane's projection, whichever
   * is further ahead.
   */
  private async reserve(lane: Lane, config: SorokitConfig, address: string): Promise<string> {
    if (lane.needsResync && lane.inFlight === 0) {
      lane.projected = null;
      lane.needsResync = false;
    }

    const account = await createRpcServer(config).getAccount(address);
    const onChain = BigInt(account.sequenceNumber());
    const projected = lane.projected;
    return projected === null || onChain > projected ? onChain.toString() : projected.toString();
  }

  private lane(networkPassphrase: string, address: string): Lane {
    const key = `${networkPassphrase}:${address}`;
    let lane = this.lanes.get(key);
    if (!lane) {
      lane = { projected: null, inFlight: 0, needsResync: false, tail: Promise.resolve() };
      this.lanes.set(key, lane);
    }
    return lane;
  }

  /**
   * Drops every projection, so the next send is built from whatever the
   * network reports. Queued sends are not cancelled.
   */
  reset(): void {
    this.lanes.clear();
  }
}

/** The process-wide sequencer every `useContractSend` queues through. */
export const transactionSequencer = new TransactionSequencer();
