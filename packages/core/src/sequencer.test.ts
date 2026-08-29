import { beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "@stellar/stellar-sdk";

const getAccount = vi.fn();

vi.mock("./rpc.js", () => ({
  createRpcServer: () => ({
    getAccount,
    // A stand-in so the proxy has something other than `getAccount` to pass through.
    getHealth: () => Promise.resolve({ status: "healthy" }),
  }),
}));

const { TransactionSequencer } = await import("./sequencer.js");
const { resolveSorokitConfig } = await import("./config.js");

const config = resolveSorokitConfig({ network: "testnet" });
const ADDRESS = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
const OTHER = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";

/** Lets every already-queued microtask run, without advancing real time. */
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/**
 * Runs a send that succeeds immediately, and reports the account sequence
 * number the transaction would have been built from.
 */
async function reservedSequence(
  sequencer: InstanceType<typeof TransactionSequencer>,
  address = ADDRESS,
): Promise<string> {
  return sequencer.enqueue({
    config,
    address,
    task: async ({ server, markSubmitted }) => {
      const sequence = (await server.getAccount(address)).sequenceNumber();
      markSubmitted();
      return sequence;
    },
  });
}

describe("transactionSequencer", () => {
  beforeEach(() => {
    getAccount.mockReset();
    getAccount.mockImplementation((id: string) => Promise.resolve(new Account(id, "100")));
  });

  it("projects the sequence number forward instead of re-reading a ledger that has not closed", async () => {
    const sequencer = new TransactionSequencer();
    // The network keeps reporting 100: the first transaction has been
    // accepted, but no ledger has closed yet.
    expect(await reservedSequence(sequencer)).toBe("100");
    expect(await reservedSequence(sequencer)).toBe("101");
    expect(await reservedSequence(sequencer)).toBe("102");
  });

  it("lets the network win when it is ahead of the projection", async () => {
    const sequencer = new TransactionSequencer();
    expect(await reservedSequence(sequencer)).toBe("100");
    // Something outside Sorokit — another tab, a CLI — moved the account on.
    getAccount.mockImplementation((id: string) => Promise.resolve(new Account(id, "500")));
    expect(await reservedSequence(sequencer)).toBe("500");
  });

  it("keeps a sequence number free when the transaction never reached the network", async () => {
    const sequencer = new TransactionSequencer();
    await expect(
      sequencer.enqueue({
        config,
        address: ADDRESS,
        task: async () => {
          throw new Error("user rejected in wallet");
        },
      }),
    ).rejects.toThrow("user rejected in wallet");

    expect(await reservedSequence(sequencer)).toBe("100");
  });

  it("re-reads the network after a submission failed, once the lane has drained", async () => {
    const sequencer = new TransactionSequencer();
    await expect(
      sequencer.enqueue({
        config,
        address: ADDRESS,
        task: async ({ markSubmitted }) => {
          markSubmitted();
          throw new Error("transaction failed after submission");
        },
      }),
    ).rejects.toThrow("transaction failed after submission");

    expect(await reservedSequence(sequencer)).toBe("100");
  });

  it("serializes sends from one account and runs different accounts concurrently", async () => {
    const sequencer = new TransactionSequencer();
    const order: string[] = [];
    const blocked = deferred();

    const first = sequencer.enqueue({
      config,
      address: ADDRESS,
      task: async ({ markSubmitted }) => {
        order.push("a:start");
        await blocked.promise;
        markSubmitted();
        order.push("a:submitted");
      },
    });
    const second = sequencer.enqueue({
      config,
      address: ADDRESS,
      task: async ({ markSubmitted }) => {
        markSubmitted();
        order.push("b:start");
      },
    });
    const otherAccount = sequencer.enqueue({
      config,
      address: OTHER,
      task: async ({ markSubmitted }) => {
        markSubmitted();
        order.push("other");
      },
    });

    await otherAccount;
    expect(order).toEqual(["a:start", "other"]);

    blocked.resolve();
    await Promise.all([first, second]);
    expect(order).toEqual(["a:start", "other", "a:submitted", "b:start"]);
  });

  it("starts the next send as soon as the previous one is submitted, not when it confirms", async () => {
    const sequencer = new TransactionSequencer();
    const confirmed = deferred();
    const started: string[] = [];

    const first = sequencer.enqueue({
      config,
      address: ADDRESS,
      task: async ({ markSubmitted }) => {
        started.push("a");
        markSubmitted();
        await confirmed.promise;
      },
    });
    const second = reservedSequence(sequencer).then((sequence) => {
      started.push("b");
      return sequence;
    });

    // The second send does not wait for the first to be confirmed.
    await expect(second).resolves.toBe("101");
    expect(started).toEqual(["a", "b"]);

    confirmed.resolve();
    await first;
  });

  it("does not let a failing send block the ones queued behind it", async () => {
    const sequencer = new TransactionSequencer();
    const failing = sequencer.enqueue({
      config,
      address: ADDRESS,
      task: async () => {
        throw new Error("boom");
      },
    });
    const next = reservedSequence(sequencer);

    await expect(failing).rejects.toThrow("boom");
    await expect(next).resolves.toBe("100");
  });

  it("reports the reserved sequence number through the context's server", async () => {
    const sequencer = new TransactionSequencer();
    await sequencer.enqueue({
      config,
      address: ADDRESS,
      task: async ({ server, markSubmitted }) => {
        const account = await server.getAccount(ADDRESS);
        expect(account.sequenceNumber()).toBe("100");
        // Building mutates the account it is given, so each read has to
        // start from the reservation again.
        account.incrementSequenceNumber();
        expect((await server.getAccount(ADDRESS)).sequenceNumber()).toBe("100");
        // Other addresses fall through to the real RPC server.
        expect((await server.getAccount(OTHER)).accountId()).toBe(OTHER);
        markSubmitted();
      },
    });
  });

  it("runs onStart when the send reaches the front of the queue", async () => {
    const sequencer = new TransactionSequencer();
    const blocked = deferred();
    const onStart = vi.fn();

    const first = sequencer.enqueue({
      config,
      address: ADDRESS,
      task: async () => blocked.promise,
    });
    const second = sequencer.enqueue({ config, address: ADDRESS, onStart, task: async () => "ok" });

    await flush();
    expect(onStart).not.toHaveBeenCalled();

    blocked.resolve();
    await Promise.all([first, second]);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("drops every projection on reset", async () => {
    const sequencer = new TransactionSequencer();
    expect(await reservedSequence(sequencer)).toBe("100");
    expect(await reservedSequence(sequencer)).toBe("101");

    sequencer.reset();
    expect(await reservedSequence(sequencer)).toBe("100");
  });
});
