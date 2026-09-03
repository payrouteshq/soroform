import { beforeEach, describe, expect, it, vi } from "vitest";
import { Api } from "@stellar/stellar-sdk/rpc";

const pollTransaction = vi.fn();

vi.mock("./rpc.js", () => ({
  createRpcServer: () => ({ pollTransaction }),
}));

const { resumePendingTransactions } = await import("./resume-pending-transactions.js");
const { pendingTransactions } = await import("./pending-transactions.js");
const { resolveSorokitConfig } = await import("./config.js");

const config = resolveSorokitConfig({ network: "TESTNET" });

function pending(overrides: Partial<Parameters<typeof pendingTransactions.add>[0]> = {}) {
  return {
    id: "send:1",
    hash: "abc123",
    address: "GABC",
    networkPassphrase: config.networkPassphrase,
    contractId: "CABC",
    method: "transfer",
    submittedAt: Date.now(),
    ...overrides,
  };
}

describe("resumePendingTransactions", () => {
  beforeEach(() => {
    pendingTransactions.clear();
    pollTransaction.mockReset();
  });

  it("polls each queued transaction and drops it once its outcome is known", async () => {
    pollTransaction.mockResolvedValue({ status: Api.GetTransactionStatus.SUCCESS });
    pendingTransactions.add(pending({ id: "a", hash: "hash-a" }));
    pendingTransactions.add(pending({ id: "b", hash: "hash-b" }));

    const onSettled = vi.fn();
    await resumePendingTransactions(config, { onSettled });

    expect(pollTransaction.mock.calls.map((call) => call[0])).toEqual(["hash-a", "hash-b"]);
    expect(onSettled).toHaveBeenCalledTimes(2);
    expect(pendingTransactions.getAll()).toEqual([]);
  });

  it("drops a transaction the ledger rejected, not just successful ones", async () => {
    pollTransaction.mockResolvedValue({ status: Api.GetTransactionStatus.FAILED });
    pendingTransactions.add(pending());

    await resumePendingTransactions(config);
    expect(pendingTransactions.getAll()).toEqual([]);
  });

  it("keeps a transaction whose outcome is still unknown", async () => {
    pollTransaction.mockResolvedValue({ status: Api.GetTransactionStatus.NOT_FOUND });
    pendingTransactions.add(pending({ id: "a" }));

    const onSettled = vi.fn();
    await resumePendingTransactions(config, { onSettled });

    expect(onSettled).not.toHaveBeenCalled();
    expect(pendingTransactions.getAll().map((e) => e.id)).toEqual(["a"]);
  });

  it("keeps a transaction when the RPC call itself fails", async () => {
    pollTransaction.mockRejectedValue(new Error("rpc unreachable"));
    pendingTransactions.add(pending({ id: "a" }));

    await resumePendingTransactions(config);
    expect(pendingTransactions.getAll()).toHaveLength(1);
  });

  it("ignores transactions submitted to a different network", async () => {
    pendingTransactions.add(
      pending({ networkPassphrase: "Public Global Stellar Network ; September 2015" }),
    );

    await resumePendingTransactions(config);
    expect(pollTransaction).not.toHaveBeenCalled();
    expect(pendingTransactions.getAll()).toHaveLength(1);
  });

  it("does not poll the same hash twice when two resumes overlap", async () => {
    let release!: () => void;
    pollTransaction.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: Api.GetTransactionStatus.SUCCESS });
        }),
    );
    pendingTransactions.add(pending());

    const first = resumePendingTransactions(config);
    await Promise.resolve();
    const second = resumePendingTransactions(config);

    release();
    await Promise.all([first, second]);
    expect(pollTransaction).toHaveBeenCalledTimes(1);
  });
});
