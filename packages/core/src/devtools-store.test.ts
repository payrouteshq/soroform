import { describe, expect, it, vi } from "vitest";
import { devtoolsSendLog, type ContractSendLogEntry } from "./devtools-store.js";

function entry(overrides: Partial<ContractSendLogEntry> = {}): ContractSendLogEntry {
  return {
    id: "1",
    contractId: "CABC",
    method: "transfer",
    status: "idle",
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("devtoolsSendLog", () => {
  it("records and lists entries", () => {
    devtoolsSendLog.clear();
    devtoolsSendLog.record(entry({ id: "a" }));
    devtoolsSendLog.record(entry({ id: "b" }));
    expect(devtoolsSendLog.getAll().map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("overwrites an entry recorded again with the same id", () => {
    devtoolsSendLog.clear();
    devtoolsSendLog.record(entry({ id: "a", status: "idle" }));
    devtoolsSendLog.record(entry({ id: "a", status: "success" }));
    const all = devtoolsSendLog.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.status).toBe("success");
  });

  it("notifies subscribers on record and clear", () => {
    devtoolsSendLog.clear();
    const listener = vi.fn();
    const unsubscribe = devtoolsSendLog.subscribe(listener);
    devtoolsSendLog.record(entry());
    expect(listener).toHaveBeenCalledTimes(1);
    devtoolsSendLog.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    devtoolsSendLog.record(entry());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns a stable getAll() reference between calls when unchanged", () => {
    devtoolsSendLog.clear();
    devtoolsSendLog.record(entry({ id: "a" }));
    expect(devtoolsSendLog.getAll()).toBe(devtoolsSendLog.getAll());
  });

  it("returns a new getAll() reference after a mutation", () => {
    devtoolsSendLog.clear();
    devtoolsSendLog.record(entry({ id: "a" }));
    const first = devtoolsSendLog.getAll();
    devtoolsSendLog.record(entry({ id: "b" }));
    expect(devtoolsSendLog.getAll()).not.toBe(first);
  });

  it("carries an optional transaction summary", () => {
    devtoolsSendLog.clear();
    devtoolsSendLog.record(
      entry({
        id: "a",
        transaction: {
          operationType: "invokeHostFunction",
          sourceAccount: "GABC",
          minResourceFee: "100",
          transactionXdr: "AAAA...",
        },
      }),
    );
    expect(devtoolsSendLog.getAll()[0]?.transaction?.operationType).toBe(
      "invokeHostFunction",
    );
  });
});
